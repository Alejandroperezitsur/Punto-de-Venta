// Legacy sync manager — delegates to Sync Engine V2.
// Kept for backward compatibility with existing imports.

import {
  initSyncEngineV2,
  enqueueSale as enqueueSaleV2,
  enqueueMovement as enqueueMovementV2,
  getSyncStatusV2,
  forceSyncNow,
} from './syncEngineV2';
import {
  saveOfflineSale,
  getUnsyncedSales,
  markSaleSynced,
  getUnsyncedMovements,
  markMovementSynced,
  type OfflineSale,
  type OfflineInventoryMovement,
} from './db';

// Re-export legacy types
export type { OfflineSale, OfflineInventoryMovement };

// ─── Legacy API (delegates to v2) ───

export async function enqueueSale(sale: Omit<OfflineSale, 'synced' | 'id'>): Promise<void> {
  const id = crypto.randomUUID?.() || 'sale-' + Date.now();
  const offlineSale: OfflineSale = { ...sale, id, synced: false };
  await saveOfflineSale(offlineSale);

  // Also enqueue in v2 transactional queue
  await enqueueSaleV2(
    {
      items: sale.items.map((i) => ({
        product_id: i.id,
        quantity: i.quantity,
        unit_price: i.price,
      })),
      discount: sale.discount,
      payment_method: sale.payment_method,
      payments: [{ method: sale.payment_method, amount: sale.total }],
    },
    sale.idempotency_key,
  );
}

export async function syncAll(): Promise<void> {
  // Legacy sync — marked as deprecated
  // Uses the v2 engine under the hood
  await forceSyncNow();
}

// ─── Status ───

export async function getSyncStatus(): Promise<{ isSyncing: boolean; pendingCount: number; queueDepth: number }> {
  const status = await getSyncStatusV2();
  const sales = await getUnsyncedSales();
  const movs = await getUnsyncedMovements();
  return {
    isSyncing: status.queueRunning,
    pendingCount: sales.length + movs.length,
    queueDepth: status.queueStats.queueDepth,
  };
}

// ─── Init ───

export function initSyncManager(): void {
  initSyncEngineV2();
}
