/// <reference types="vite/client" />

import {
  getDB,
  type QueueItem,
  type QueueItemStatus,
  type QueueItemType,
  type DeadLetterItem,
  type QueueCheckpoint,
  type QueueLock,
} from './db';

// ─── Configuration ───

export interface QueueConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  lockDurationMs: number;
  lockRenewIntervalMs: number;
  batchSize: number;
  checkpointInterval: number;
  poisonThreshold: number;
  orphanTimeoutMs: number;
  networkLatencyThresholdMs: number;
  packetLossThreshold: number;
}

const DEFAULT_CONFIG: QueueConfig = {
  maxAttempts: 5,
  baseDelayMs: 500,
  maxDelayMs: 30000,
  lockDurationMs: 30000,
  lockRenewIntervalMs: 10000,
  batchSize: 10,
  checkpointInterval: 10,
  poisonThreshold: 3,
  orphanTimeoutMs: 300000,
  networkLatencyThresholdMs: 2000,
  packetLossThreshold: 0.1,
};

// ─── Network Quality ───

export interface NetworkQuality {
  latencyMs: number;
  packetLoss: number;
  quality: 'good' | 'degraded' | 'poor' | 'dead';
  timestamp: number;
}

export class NetworkQualityDetector {
  private samples: Array<{ latency: number; success: boolean }> = [];
  private readonly maxSamples = 20;
  private measuring = false;
  private forcedQuality: NetworkQuality['quality'] | null = null;

  forceQuality(q: NetworkQuality['quality'] | null): void {
    this.forcedQuality = q;
  }

  async measure(): Promise<NetworkQuality> {
    if (this.measuring) return this.estimate();
    
    const isStaticEnv = typeof window !== 'undefined' && (
      window.location.hostname.includes('github.io') || 
      window.location.hostname.includes('github.com')
    );

    if (isStaticEnv) {
      return { latencyMs: 0, packetLoss: 0, quality: 'good', timestamp: Date.now() };
    }

    this.measuring = true;
    try {
      const start = performance.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        await fetch('/api/health/ping', {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-store',
        });
        clearTimeout(timeout);
        const latency = performance.now() - start;
        this.samples.push({ latency, success: true });
      } catch {
        clearTimeout(timeout);
        // Don't push failure on first fetch error (could be test/dev env)
        if (this.samples.length > 0) {
          this.samples.push({ latency: 5000, success: false });
        }
      }
      if (this.samples.length > this.maxSamples) {
        this.samples = this.samples.slice(-this.maxSamples);
      }
    } finally {
      this.measuring = false;
    }
    return this.estimate();
  }

  private estimate(): NetworkQuality {
    if (this.forcedQuality !== null) {
      return { latencyMs: 0, packetLoss: 0, quality: this.forcedQuality, timestamp: Date.now() };
    }
    if (this.samples.length === 0) {
      return { latencyMs: 0, packetLoss: 0, quality: 'good', timestamp: Date.now() };
    }
    const recent = this.samples.length > 10 ? this.samples.slice(-10) : this.samples;
    const avgLatency = recent.reduce((s, x) => s + x.latency, 0) / recent.length;
    const failures = recent.filter((x) => !x.success).length;
    const loss = failures / recent.length;
    let quality: NetworkQuality['quality'];
    if (loss > 0.5) quality = 'dead';
    else if (loss > (this.packetLossThreshold || 0.1) || avgLatency > 3000) quality = 'poor';
    else if (avgLatency > 1000) quality = 'degraded';
    else quality = 'good';
    return { latencyMs: Math.round(avgLatency), packetLoss: loss, quality, timestamp: Date.now() };
  }

  getLatencyMs(): number {
    return this.estimate().latencyMs;
  }

  getQuality(): NetworkQuality['quality'] {
    return this.estimate().quality;
  }
}

// ─── Full Jitter Retry ───

function fullJitter(baseMs: number, capMs: number, attempt: number): number {
  const exponential = Math.min(capMs, baseMs * Math.pow(2, attempt));
  return Math.random() * exponential;
}

// ─── ID Generation ───

function uid(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : 'q-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
}

// ─── Queue Lock ───

export class QueueLockError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'QueueLockError';
  }
}

async function acquireLock(
  resourceId: string,
  owner: string,
  durationMs: number,
): Promise<string> {
  const db = await getDB();
  const tx = db.transaction('queueLocks', 'readwrite');
  const store = tx.store;
  const index = store.index('by-resource');
  const existing = await index.get(resourceId);
  const now = Date.now();
  if (existing) {
    if (existing.expiresAt > now && existing.owner !== owner) {
      throw new QueueLockError(`Resource locked by ${existing.owner} until ${new Date(existing.expiresAt).toISOString()}`);
    }
    if (existing.expiresAt > now && existing.owner === owner) {
      existing.expiresAt = now + durationMs;
      await store.put(existing);
      await tx.done;
      return existing.id;
    }
    await store.delete(existing.id);
  }
  const lock: QueueLock = {
    id: uid(),
    resourceId,
    expiresAt: now + durationMs,
    owner,
    createdAt: now,
  };
  await store.put(lock);
  await tx.done;
  return lock.id;
}

async function renewLock(lockId: string, durationMs: number): Promise<boolean> {
  const db = await getDB();
  const lock = await db.get('queueLocks', lockId);
  if (!lock) return false;
  if (lock.expiresAt < Date.now()) return false;
  lock.expiresAt = Date.now() + durationMs;
  await db.put('queueLocks', lock);
  return true;
}

async function releaseLock(lockId: string): Promise<void> {
  const db = await getDB();
  await db.delete('queueLocks', lockId);
}

// ─── Poison Message Detector ───

export interface PoisonResult {
  isPoison: boolean;
  reason: string | null;
}

export class PoisonMessageDetector {
  private failurePatterns: Map<string, Array<{ error: string; timestamp: number }>> = new Map();
  private readonly patternWindowMs = 300000;
  private readonly maxPatternFailures = 5;

  recordFailure(itemId: string, error: string): void {
    const now = Date.now();
    const history = this.failurePatterns.get(itemId) || [];
    history.push({ error, timestamp: now });
    const recent = history.filter((h) => now - h.timestamp < this.patternWindowMs);
    this.failurePatterns.set(itemId, recent);
  }

  detect(item: QueueItem, lastError: string): PoisonResult {
    const history = this.failurePatterns.get(item.id) || [];
    if (history.length >= this.maxPatternFailures) {
      return { isPoison: true, reason: `Failed ${history.length} times in pattern window` };
    }
    const uniqueErrors = new Set(history.map((h) => h.error));
    if (uniqueErrors.size >= 3) {
      return { isPoison: true, reason: `Multiple error types: ${[...uniqueErrors].join(', ')}` };
    }
    if (lastError.includes('401') || lastError.includes('403')) {
      return { isPoison: true, reason: `Auth error: ${lastError}` };
    }
    if (lastError.includes('400') && item.attempts >= 2) {
      return { isPoison: true, reason: `Validation error after retries: ${lastError}` };
    }
    return { isPoison: false, reason: null };
  }

  clear(itemId: string): void {
    this.failurePatterns.delete(itemId);
  }
}

// ─── Adaptive Throttling ───

export class AdaptiveThrottler {
  private networkQuality: NetworkQualityDetector;
  private currentBatchSize: number;
  private currentDelayMs: number;
  private readonly config: QueueConfig;

  constructor(config: QueueConfig, detector: NetworkQualityDetector) {
    this.config = config;
    this.networkQuality = detector;
    this.currentBatchSize = config.batchSize;
    this.currentDelayMs = 0;
  }

  async adjust(): Promise<void> {
    const quality = this.networkQuality.getQuality();
    if (quality === 'dead') {
      this.currentBatchSize = 0;
      this.currentDelayMs = 30000;
    } else if (quality === 'poor') {
      this.currentBatchSize = Math.max(1, Math.floor(this.config.batchSize / 4));
      this.currentDelayMs = 5000;
    } else if (quality === 'degraded') {
      this.currentBatchSize = Math.max(1, Math.floor(this.config.batchSize / 2));
      this.currentDelayMs = 1000;
    } else {
      this.currentBatchSize = this.config.batchSize;
      this.currentDelayMs = 50;
    }
  }

  getBatchSize(): number {
    return this.currentBatchSize;
  }

  getDelayMs(): number {
    return this.currentDelayMs;
  }

  shouldProcess(): boolean {
    return this.currentBatchSize > 0;
  }
}

// ─── Transactional Queue ───

export type QueueProcessor = (
  items: QueueItem[],
) => Promise<Array<{ id: string; ok: boolean; error?: string }>>;

export interface QueueStats {
  pending: number;
  processing: number;
  dead: number;
  done: number;
  delivered: number;
  deadLetterCount: number;
  checkpointCount: number;
  queueDepth: number;
}

export class TransactionalQueue {
  private config: QueueConfig;
  private processor: QueueProcessor | null = null;
  private running = false;
  private lockId: string | null = null;
  private renewTimer: ReturnType<typeof setInterval> | null = null;
  private readonly owner: string;
  private readonly detector: NetworkQualityDetector;
  private readonly poisonDetector: PoisonMessageDetector;
  private readonly throttler: AdaptiveThrottler;
  private currentCheckpoint = 0;

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.owner = 'queue-' + uid();
    this.detector = new NetworkQualityDetector();
    this.poisonDetector = new PoisonMessageDetector();
    this.throttler = new AdaptiveThrottler(this.config, this.detector);
  }

  setProcessor(processor: QueueProcessor): void {
    this.processor = processor;
  }

  getNetworkDetector(): NetworkQualityDetector {
    return this.detector;
  }

  getPoisonDetector(): PoisonMessageDetector {
    return this.poisonDetector;
  }

  async enqueue(
    type: QueueItemType,
    payload: unknown,
    idempotencyKey: string,
    correlationId: string,
    priority = 0,
  ): Promise<string> {
    const db = await getDB();
    const id = uid();
    const item: QueueItem = {
      id,
      type,
      priority,
      payload,
      idempotencyKey,
      correlationId,
      status: 'pending',
      attempts: 0,
      maxAttempts: this.config.maxAttempts,
      lastError: null,
      nextRetryAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      checkpoint: 0,
      batchId: null,
    };
    await db.put('queueItems', item);
    return id;
  }

  async enqueueBatch(
    items: Array<{
      type: QueueItemType;
      payload: unknown;
      idempotencyKey: string;
      correlationId: string;
      priority?: number;
    }>,
  ): Promise<string[]> {
    const db = await getDB();
    const batchId = uid();
    const ids: string[] = [];
    const tx = db.transaction('queueItems', 'readwrite');
    for (const item of items) {
      const id = uid();
      ids.push(id);
      tx.store.put({
        id,
        type: item.type,
        priority: item.priority ?? 0,
        payload: item.payload,
        idempotencyKey: item.idempotencyKey,
        correlationId: item.correlationId,
        status: 'pending',
        attempts: 0,
        maxAttempts: this.config.maxAttempts,
        lastError: null,
        nextRetryAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        checkpoint: 0,
        batchId,
      } as QueueItem);
    }
    await tx.done;
    return ids;
  }

  async getStats(): Promise<QueueStats> {
    const db = await getDB();
    const all = await db.getAll('queueItems');
    const pending = all.filter((i) => i.status === 'pending').length;
    const processing = all.filter((i) => i.status === 'processing').length;
    const dead = all.filter((i) => i.status === 'dead').length;
    const done = all.filter((i) => i.status === 'done').length;
    const delivered = all.filter((i) => i.status === 'delivered').length;
    const deadLetterCount = await db.count('deadLetters');
    const checkpoints = await db.getAll('queueCheckpoints');
    return {
      pending,
      processing,
      dead,
      done,
      delivered,
      deadLetterCount,
      checkpointCount: checkpoints.length,
      queueDepth: pending + processing,
    };
  }

  async getPendingItems(): Promise<QueueItem[]> {
    const db = await getDB();
    const all = await db.getAll('queueItems');
    return all.filter(
      (i) =>
        (i.status === 'pending' || i.status === 'processing') &&
        (i.nextRetryAt === null || i.nextRetryAt <= Date.now()),
    );
  }

  private async recoverOrphans(): Promise<void> {
    const db = await getDB();
    const all = await db.getAll('queueItems');
    const now = Date.now();
    for (const item of all) {
      if (item.status === 'processing' && item.updatedAt < now - this.config.orphanTimeoutMs) {
        item.status = 'pending';
        item.attempts += 1;
        item.lastError = 'Orphan detected (processing timeout)';
        const delay = fullJitter(this.config.baseDelayMs, this.config.maxDelayMs, item.attempts);
        item.nextRetryAt = now + delay;
        item.updatedAt = now;
        await db.put('queueItems', item);
        await db.put('orphanLog', {
          id: uid(),
          operationId: item.id,
          type: 'orphan_recovery',
          detectedAt: now,
          resolution: 'reverted_to_pending',
        });
      }
    }
  }

  private async saveCheckpoint(lastId: string): Promise<void> {
    this.currentCheckpoint += 1;
    if (this.currentCheckpoint % this.config.checkpointInterval !== 0) return;
    const db = await getDB();
    const existing = await db.get('queueCheckpoints', 'main');
    const cp: QueueCheckpoint = {
      id: 'main',
      lastProcessedId: lastId,
      itemCount: this.currentCheckpoint,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    await db.put('queueCheckpoints', cp);
  }

  private async moveToDeadLetter(
    item: QueueItem,
    errorHistory: Array<{ attempt: number; error: string; timestamp: number }>,
  ): Promise<void> {
    const db = await getDB();
    const dl: DeadLetterItem = {
      id: uid(),
      originalId: item.id,
      type: item.type,
      payload: item.payload,
      errorHistory,
      poisonedAt: Date.now(),
      correlationId: item.correlationId,
    };
    await db.put('deadLetters', dl);
    item.status = 'dead';
    item.updatedAt = Date.now();
    await db.put('queueItems', item);
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    await this.recoverOrphans();

    await this.detector.measure();

    try {
      this.lockId = await acquireLock('queue-processor', this.owner, this.config.lockDurationMs);
    } catch (e) {
      if (e instanceof QueueLockError) {
        console.warn('[Queue] Another instance owns the lock');
        this.running = false;
        return;
      }
      throw e;
    }

    this.renewTimer = setInterval(async () => {
      if (this.lockId) {
        const ok = await renewLock(this.lockId, this.config.lockDurationMs);
        if (!ok) {
          console.warn('[Queue] Lock expired, releasing processor');
          this.running = false;
        }
      }
    }, this.config.lockRenewIntervalMs);

    this.processLoop();
  }

  private async processLoop(): Promise<void> {
    while (this.running) {
      try {
        await this.processBatch();
      } catch (e) {
        console.error('[Queue] Process error:', e);
      }
      await new Promise((r) => setTimeout(r, this.throttler.getDelayMs()));
    }
  }

  private async processBatch(): Promise<void> {
    if (!this.processor) return;

    await this.throttler.adjust();
    if (!this.throttler.shouldProcess()) return;

    const items = await this.getPendingItems();
    if (items.length === 0) {
      await new Promise((r) => setTimeout(r, 500));
      return;
    }

    const batch = items.slice(0, this.throttler.getBatchSize());

    const db = await getDB();
    const tx = db.transaction('queueItems', 'readwrite');
    for (const item of batch) {
      item.status = 'processing';
      item.updatedAt = Date.now();
      await tx.store.put(item);
    }
    await tx.done;

    const results = await this.processor(batch);

    for (const result of results) {
      const item = batch.find((i) => i.id === result.id);
      if (!item) continue;

      if (result.ok) {
        item.status = 'delivered';
        item.lastError = null;
        item.updatedAt = Date.now();
        await db.put('queueItems', item);
        this.poisonDetector.clear(item.id);
        await this.saveCheckpoint(item.id);
      } else {
        item.attempts += 1;
        item.lastError = result.error ?? 'Unknown error';
        item.updatedAt = Date.now();
        this.poisonDetector.recordFailure(item.id, result.error ?? '');

        const poison = this.poisonDetector.detect(item, result.error ?? '');
        if (poison.isPoison) {
          await this.moveToDeadLetter(item, [
            { attempt: item.attempts, error: result.error ?? '', timestamp: Date.now() },
          ]);
          continue;
        }

        if (item.attempts >= item.maxAttempts) {
          await this.moveToDeadLetter(item, [
            { attempt: item.attempts, error: result.error ?? '', timestamp: Date.now() },
          ]);
          continue;
        }

        const delay = fullJitter(this.config.baseDelayMs, this.config.maxDelayMs, item.attempts);
        item.status = 'pending';
        item.nextRetryAt = Date.now() + delay;
        await db.put('queueItems', item);
      }
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.renewTimer) {
      clearInterval(this.renewTimer);
      this.renewTimer = null;
    }
    if (this.lockId) {
      await releaseLock(this.lockId);
      this.lockId = null;
    }
  }

  async retryDeadLetters(): Promise<number> {
    const db = await getDB();
    const deadLetters = await db.getAll('deadLetters');
    let count = 0;
    for (const dl of deadLetters) {
      const existing = await db.get('queueItems', dl.originalId);
      if (existing) {
        existing.status = 'pending';
        existing.attempts = 0;
        existing.lastError = null;
        existing.nextRetryAt = Date.now() + 1000;
        existing.updatedAt = Date.now();
        await db.put('queueItems', existing);
      }
      await db.delete('deadLetters', dl.id);
      count++;
    }
    return count;
  }

  async clearAll(): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(['queueItems', 'deadLetters', 'queueCheckpoints', 'queueLocks'], 'readwrite');
    await tx.objectStore('queueItems').clear();
    await tx.objectStore('deadLetters').clear();
    await tx.objectStore('queueCheckpoints').clear();
    await tx.objectStore('queueLocks').clear();
    await tx.done;
  }

  getConfig(): QueueConfig {
    return { ...this.config };
  }
}

export function createDefaultQueue(): TransactionalQueue {
  return new TransactionalQueue();
}
