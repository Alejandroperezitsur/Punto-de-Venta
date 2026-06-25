import type { QueueItem } from './db';
import { TransactionalQueue, type QueueProcessor } from './transactionalQueue';
import { createLogger } from './structuredLogger';
import { isStaticEnv } from '../utils/env';

const logger = createLogger('SyncEngineV2');

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ─── Token Management (passthrough to worker) ───

let currentToken: string | null = null;
let currentStoreId: number | null = null;
let currentUserId: number | null = null;

export function setAuth(token: string, storeId: number, userId: number): void {
  currentToken = token;
  currentStoreId = storeId;
  currentUserId = userId;
}

export function getAuth(): { token: string | null; storeId: number | null; userId: number | null } {
  return { token: currentToken, storeId: currentStoreId, userId: currentUserId };
}

// ─── Backend Communication ───

interface BatchResult {
  id: string;
  ok: boolean;
  error?: string;
  serverId?: number;
}

async function sendBatch(endpoint: string, items: Array<{ id: string; payload: unknown; idempotencyKey: string }>): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  if (items.length === 0) return results;

  if (isStaticEnv) {
    return items.map(i => ({ id: i.id, ok: true }));
  }

  const correlationId = crypto.randomUUID?.() || 'corr-' + Date.now();

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
        'X-Correlation-ID': correlationId,
        'X-Store-ID': String(currentStoreId ?? 1),
      },
      body: JSON.stringify({
        operations: items.map((i) => ({
          client_id: i.id,
          idempotency_key: i.idempotencyKey,
          payload: i.payload,
        })),
        store_id: currentStoreId ?? 1,
        user_id: currentUserId ?? null,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      if (response.status === 409) {
        return items.map((i) => ({ id: i.id, ok: true, conflict: true }));
      }
      if (response.status >= 500) {
        return items.map((i) => ({ id: i.id, ok: false, error: `Server error ${response.status}` }));
      }
      return items.map((i) => ({ id: i.id, ok: false, error: text }));
    }

    const json = await response.json().catch(() => ({}));
    const batchResults = json.data?.results || json.results || [];
    const resultMap = new Map<string, { ok: boolean; error?: string; serverId?: number }>();
    for (const r of batchResults) {
      resultMap.set(r.client_id || r.id, { ok: r.ok ?? true, error: r.error, serverId: r.server_id });
    }
    for (const item of items) {
      const r = resultMap.get(item.id);
      if (r) {
        results.push({ id: item.id, ...r });
      } else {
        results.push({ id: item.id, ok: false, error: 'Item not found in server response' });
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return items.map((i) => ({ id: i.id, ok: false, error: msg }));
  }

  return results;
}

// ─── Worker Communication ───

let worker: Worker | null = null;
let workerReady = false;
let pendingWorkerResolves: Map<
  string,
  (result: { ok: boolean; error?: string; data?: unknown }) => void
> = new Map();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../workers/syncWorker.ts', import.meta.url), { type: 'module' });
    worker.addEventListener('message', handleWorkerMessage);
    worker.addEventListener('error', (e) => {
      logger.error('Worker error', e);
    });
  }
  return worker;
}

function handleWorkerMessage(event: MessageEvent): void {
  const msg = event.data;
  if (msg.type === 'WORKER_READY') {
    workerReady = true;
    if (currentToken) {
      getWorker().postMessage({ type: 'AUTH_UPDATE', token: currentToken, storeId: currentStoreId, userId: currentUserId });
    }
    return;
  }
  if (msg.type === 'LOG') {
    logger.info(`[Worker] ${msg.level}: ${msg.message}`);
    return;
  }
  if (msg.type === 'TASK_RESULT' || msg.type === 'SYNC_SALE_RESULT' || msg.type === 'SYNC_MOVEMENT_RESULT') {
    const resolve = pendingWorkerResolves.get(msg.id);
    if (resolve) {
      resolve({ ok: msg.ok, error: msg.error, data: msg.data });
      pendingWorkerResolves.delete(msg.id);
    }
  }
}

async function postWorkerAndWait(msg: Record<string, unknown>, timeoutMs = 30000): Promise<{ ok: boolean; error?: string; data?: unknown }> {
  const id = crypto.randomUUID?.() || String(Date.now());
  return new Promise((resolve) => {
    pendingWorkerResolves.set(id, resolve);
    getWorker().postMessage({ ...msg, id });
    setTimeout(() => {
      if (pendingWorkerResolves.has(id)) {
        pendingWorkerResolves.delete(id);
        resolve({ ok: false, error: 'Worker timeout' });
      }
    }, timeoutMs);
  });
}

// ─── Queue Processor ───

const queue = new TransactionalQueue({
  batchSize: 10,
  maxAttempts: 5,
  baseDelayMs: 500,
  maxDelayMs: 30000,
  poisonThreshold: 3,
});

const processor: QueueProcessor = async (items) => {
  const sales = items.filter((i) => i.type === 'sale');
  const movements = items.filter((i) => i.type === 'inventory_movement');
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  if (sales.length > 0) {
    const saleResults = await sendBatch(
      '/sales/batch',
      sales.map((s) => ({
        id: s.id,
        idempotencyKey: s.idempotencyKey,
        payload: s.payload,
      })),
    );
    results.push(...saleResults);
  }

  if (movements.length > 0) {
    const movResults = await sendBatch(
      '/inventory/batch-move',
      movements.map((m) => ({
        id: m.id,
        idempotencyKey: m.idempotencyKey,
        payload: m.payload,
      })),
    );
    results.push(...movResults);
  }

  return results;
};

// ─── Public API ───

export async function initSyncEngineV2(): Promise<void> {
  queue.setProcessor(processor);

  const storedToken = localStorage.getItem('token');
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  })();

  if (storedToken && storedUser) {
    setAuth(storedToken, storedUser.storeId || 1, storedUser.id || 0);
  }

  if (worker) {
    getWorker().postMessage({
      type: 'AUTH_UPDATE',
      token: currentToken,
      storeId: currentStoreId,
      userId: currentUserId,
    });
  }

  window.addEventListener('online', () => {
    logger.info('Network online, starting queue');
    queue.start();
  });

  window.addEventListener('offline', () => {
    logger.info('Network offline, stopping queue');
    queue.stop();
  });

  const tokenCheck = setInterval(() => {
    const t = localStorage.getItem('token');
    if (t && t !== currentToken) {
      setAuth(t, currentStoreId ?? 1, currentUserId ?? 0);
      if (workerReady) {
        getWorker().postMessage({ type: 'AUTH_UPDATE', token: t, storeId: currentStoreId, userId: currentUserId });
      }
    }
  }, 60000);

  window.addEventListener('beforeunload', () => {
    clearInterval(tokenCheck);
    queue.stop();
  });

  if (navigator.onLine) {
    setTimeout(() => queue.start(), 3000);
  }

  logger.info('Sync Engine V2 initialized');
}

export async function enqueueSale(salePayload: unknown, idempotencyKey: string): Promise<string> {
  const correlationId = crypto.randomUUID?.() || 'corr-' + Date.now();
  return queue.enqueue('sale', salePayload, idempotencyKey, correlationId, 1);
}

export async function enqueueMovement(
  productId: string,
  change: number,
): Promise<string> {
  const idempotencyKey = `mov-${productId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const correlationId = crypto.randomUUID?.() || 'corr-' + Date.now();
  return queue.enqueue(
    'inventory_movement',
    { product_id: productId, change },
    idempotencyKey,
    correlationId,
    0,
  );
}

export async function getSyncStatusV2(): Promise<{
  queueStats: Awaited<ReturnType<typeof queue.getStats>>;
  networkQuality: string;
  queueRunning: boolean;
}> {
  const stats = await queue.getStats();
  const nq = queue.getNetworkDetector().getQuality();
  return { queueStats: stats, networkQuality: nq, queueRunning: queueRunning };
}

let queueRunning = false;

export async function forceSyncNow(): Promise<void> {
  if (!navigator.onLine) return;
  logger.info('Forcing sync');
  if (!queueRunning) {
    queueRunning = true;
    await queue.start();
  }
}

export function getTransactionQueue(): TransactionalQueue {
  return queue;
}
