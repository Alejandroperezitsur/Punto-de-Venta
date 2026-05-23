import {
  saveOfflineSale,
  getUnsyncedSales,
  markSaleSynced,
  getUnsyncedMovements,
  markMovementSynced,
  type OfflineSale,
  type OfflineInventoryMovement,
} from './db';

type SyncWorker = Worker;
let worker: SyncWorker | null = null;
let pendingResolves: Map<string, (result: { ok: boolean; error?: string }) => void> = new Map();
let isSyncing = false;

function getWorker(): SyncWorker {
  if (!worker) {
    worker = new Worker(new URL('../workers/syncWorker.ts', import.meta.url), { type: 'module' });
    worker.addEventListener('message', handleWorkerMessage);
    worker.addEventListener('error', (e) => {
      console.error('Sync worker error:', e);
    });
  }
  return worker;
}

function handleWorkerMessage(event: MessageEvent): void {
  const msg = event.data;

  if (msg.type === 'SYNC_SALE_RESULT' || msg.type === 'SYNC_MOVEMENT_RESULT') {
    const resolve = pendingResolves.get(msg.id);
    if (resolve) {
      resolve({ ok: msg.ok, error: msg.error });
      pendingResolves.delete(msg.id);
    }
  }

  if (msg.type === 'SYNC_ALL_READY') {
    isSyncing = false;
  }
}

async function postMessageAndWait(
  msg: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const id = crypto.randomUUID?.() || String(Date.now());
    pendingResolves.set(id, resolve);
    getWorker().postMessage({ ...msg, id });
    // Timeout after 30s
    setTimeout(() => {
      if (pendingResolves.has(id)) {
        pendingResolves.delete(id);
        resolve({ ok: false, error: 'Timeout' });
      }
    }, 30000);
  });
}

export async function enqueueSale(sale: Omit<OfflineSale, 'synced' | 'id'>): Promise<void> {
  const id = crypto.randomUUID?.() || 'sale-' + Date.now();
  const offlineSale: OfflineSale = {
    ...sale,
    id,
    synced: false,
  };
  await saveOfflineSale(offlineSale);
  trySyncNow();
}

export async function syncAll(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const sales = await getUnsyncedSales();
    for (const sale of sales) {
      const result = await postMessageAndWait({
        type: 'SYNC_SALE',
        id: sale.id,
        idempotencyKey: sale.idempotency_key,
        payload: {
          items: sale.items.map((i) => ({
            product_id: i.id,
            quantity: i.quantity,
            unit_price: i.price,
          })),
          discount: sale.discount,
          payment_method: sale.payment_method,
          payments: [{ method: sale.payment_method, amount: sale.total }],
        },
      });

      if (result.ok) {
        await markSaleSynced(sale.id);
      } else {
        window.dispatchEvent(
          new CustomEvent('sync-error', {
            detail: { type: 'sale', id: sale.id, error: result.error },
          }),
        );
      }
    }

    const movements = await getUnsyncedMovements();
    for (const mov of movements) {
      const result = await postMessageAndWait({
        type: 'SYNC_MOVEMENT',
        id: mov.id,
        idempotencyKey: mov.id,
        payload: {
          product_id: mov.product_id,
          change: mov.change,
        },
      });

      if (result.ok) {
        await markMovementSynced(mov.id);
      } else {
        window.dispatchEvent(
          new CustomEvent('sync-error', {
            detail: { type: 'movement', id: mov.id, error: result.error },
          }),
        );
      }
    }
  } finally {
    isSyncing = false;
    window.dispatchEvent(new CustomEvent('sync-complete'));
  }
}

let syncTimeout: ReturnType<typeof setTimeout> | null = null;

function trySyncNow(): void {
  if (navigator.onLine) {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      syncAll();
    }, 2000);
  }
}

export function initSyncManager(): void {
  window.addEventListener('online', () => {
    syncAll();
  });

  window.addEventListener('sync-error', ((e: CustomEvent) => {
    console.warn('Sync error:', e.detail);
  }) as EventListener);

  if (navigator.onLine) {
    setTimeout(() => syncAll(), 3000);
  }
}

export function getSyncStatus(): { isSyncing: boolean } {
  return { isSyncing };
}
