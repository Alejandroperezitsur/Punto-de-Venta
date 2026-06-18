import { openDB, type IDBPDatabase, type DBSchema } from 'idb';

// ─── Legacy Types (Phase 1-7) ───

export interface OfflineSale {
  id: string;
  items: SaleItem[];
  total: number;
  tax: number;
  discount: number;
  payment_method: 'cash' | 'card';
  created_at: Date;
  synced: boolean;
  idempotency_key: string;
}

export interface SaleItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock?: number;
}

export interface OfflineInventoryMovement {
  id: string;
  product_id: string;
  change: number;
  created_at: Date;
  synced: boolean;
}

export interface CartPersist {
  id: string;
  items: SaleItem[];
  customer: null | { id: string; name: string };
  discount: number;
  checkoutId: string | null;
  updated_at: number;
}

// ─── Phase 8 Enterprise Types ───

export type QueueItemStatus = 'pending' | 'processing' | 'done' | 'delivered' | 'dead';
export type QueueItemType = 'sale' | 'inventory_movement' | 'cash_movement' | 'product_update' | 'customer_update';

export interface QueueItem {
  id: string;
  type: QueueItemType;
  priority: number;
  payload: unknown;
  idempotencyKey: string;
  correlationId: string;
  status: QueueItemStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  nextRetryAt: number | null;
  createdAt: number;
  updatedAt: number;
  checkpoint: number;
  batchId: string | null;
}

export interface DeadLetterItem {
  id: string;
  originalId: string;
  type: QueueItemType;
  payload: unknown;
  errorHistory: Array<{ attempt: number; error: string; timestamp: number }>;
  poisonedAt: number;
  correlationId: string;
}

export interface QueueCheckpoint {
  id: string;
  lastProcessedId: string | null;
  itemCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface QueueLock {
  id: string;
  resourceId: string;
  expiresAt: number;
  owner: string;
  createdAt: number;
}

export interface InventoryVersion {
  id: string;
  productId: string;
  version: number;
  checksum: string | null;
  lastConflict: number | null;
  vectorClock: Record<string, number>;
  updatedAt: number;
}

export interface ReconciliationLog {
  id: string;
  storeId: number;
  type: 'drift' | 'conflict' | 'resolved' | 'checksum_mismatch';
  productId: string | null;
  serverVersion: number | null;
  clientVersion: number | null;
  driftAmount: number | null;
  resolution: 'server_wins' | 'client_wins' | 'merge' | null;
  details: string | null;
  createdAt: number;
}

export interface IntegrityCheck {
  id: string;
  checkId: string;
  status: 'pass' | 'fail';
  details: string | null;
  checkedAt: number;
}

export interface Snapshot {
  id: string;
  data: string;
  checksum: string;
  itemCount: number;
  createdAt: number;
}

export interface OrphanLog {
  id: string;
  operationId: string;
  type: string;
  detectedAt: number;
  resolution: string | null;
}

export interface ClientAuditEvent {
  id: string;
  event: string;
  correlationId: string;
  actor: string | null;
  refType: string | null;
  refId: string | null;
  beforeSnapshot: string | null;
  afterSnapshot: string | null;
  metadata: string | null;
  hash: string;
  prevHash: string | null;
  createdAt: number;
}

export interface ApiCacheEntry {
  request: string;
  method: string;
  response: any;
  tags: string[];
  updatedAt: number;
}

interface POSDB extends DBSchema {
  offlineSales: {
    key: string;
    value: OfflineSale;
    indexes: { 'by-synced': number; 'by-date': Date };
  };
  offlineMovements: {
    key: string;
    value: OfflineInventoryMovement;
    indexes: { 'by-synced': number };
  };
  cartPersist: {
    key: string;
    value: CartPersist;
  };
  queueItems: {
    key: string;
    value: QueueItem;
    indexes: {
      'by-status': QueueItemStatus;
      'by-type': QueueItemType;
      'by-next-retry': number;
      'by-correlation': string;
      'by-checkpoint': number;
    };
  };
  deadLetters: {
    key: string;
    value: DeadLetterItem;
    indexes: { 'by-original': string; 'by-type': QueueItemType };
  };
  queueCheckpoints: {
    key: string;
    value: QueueCheckpoint;
  };
  queueLocks: {
    key: string;
    value: QueueLock;
    indexes: { 'by-resource': string; 'by-expires': number };
  };
  inventoryVersions: {
    key: string;
    value: InventoryVersion;
    indexes: { 'by-product': string };
  };
  reconciliationLogs: {
    key: string;
    value: ReconciliationLog;
    indexes: { 'by-store': number; 'by-type': string };
  };
  integrityChecks: {
    key: string;
    value: IntegrityCheck;
    indexes: { 'by-status': string };
  };
  snapshots: {
    key: string;
    value: Snapshot;
    indexes: { 'by-created': number };
  };
  orphanLog: {
    key: string;
    value: OrphanLog;
  };
  clientAudit: {
    key: string;
    value: ClientAuditEvent;
    indexes: { 'by-event': string; 'by-correlation': string; 'by-created': number };
  };
  apiCache: {
    key: string;
    value: ApiCacheEntry;
    indexes: { 'by-tag': string; 'by-updatedAt': number };
  };
  products: {
    key: string;
    value: any;
    indexes: { 'by-sku': string };
  };
  sales: {
    key: string;
    value: any;
    indexes: { 'by-idempotency': string };
  };
  metrics: {
    key: string;
    value: any;
    indexes: { 'by-name': string; 'by-timestamp': number };
  };
  alerts: {
    key: string;
    value: any;
    indexes: { 'by-rule': string; 'by-status': string; 'by-severity': string };
  };
  checksums: {
    key: string;
    value: any;
    indexes: { 'by-product': string };
  };
  reconciliationSnapshots: {
    key: string;
    value: any;
    indexes: { 'by-store': string; 'by-timestamp': number };
  };
  reconciliationJobs: {
    key: string;
    value: any;
    indexes: { 'by-store': string; 'by-status': string };
  };
  syncLog: {
    key: string;
    value: any;
    indexes: { 'by-idempotency': string; 'by-correlation': string; 'by-timestamp': number };
  };
  conflicts: {
    key: string;
    value: any;
    indexes: { 'by-product': string; 'by-resolved': string };
  };
  inventoryMovements: {
    key: string;
    value: any;
    indexes: { 'by-product': string; 'by-synced': string };
  };
  settings: {
    key: string;
    value: { key: string; value: unknown };
  };
}

const DB_NAME = 'pos-offline';
const DB_VERSION = 5;

let dbPromise: Promise<IDBPDatabase<POSDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<POSDB>> {
  if (!dbPromise) {
    dbPromise = openDB<POSDB>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, _tx) {
        if (!db.objectStoreNames.contains('offlineSales')) {
          const s = db.createObjectStore('offlineSales', { keyPath: 'id' });
          s.createIndex('by-synced', 'synced');
          s.createIndex('by-date', 'created_at');
        }
        if (!db.objectStoreNames.contains('offlineMovements')) {
          const s = db.createObjectStore('offlineMovements', { keyPath: 'id' });
          s.createIndex('by-synced', 'synced');
        }
        if (!db.objectStoreNames.contains('cartPersist')) {
          db.createObjectStore('cartPersist', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('queueItems')) {
          const s = db.createObjectStore('queueItems', { keyPath: 'id' });
          s.createIndex('by-status', 'status');
          s.createIndex('by-type', 'type');
          s.createIndex('by-next-retry', 'nextRetryAt');
          s.createIndex('by-correlation', 'correlationId');
          s.createIndex('by-checkpoint', 'checkpoint');
        }
        if (!db.objectStoreNames.contains('deadLetters')) {
          const s = db.createObjectStore('deadLetters', { keyPath: 'id' });
          s.createIndex('by-original', 'originalId');
          s.createIndex('by-type', 'type');
        }
        if (!db.objectStoreNames.contains('queueCheckpoints')) {
          db.createObjectStore('queueCheckpoints', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('queueLocks')) {
          const s = db.createObjectStore('queueLocks', { keyPath: 'id' });
          s.createIndex('by-resource', 'resourceId');
          s.createIndex('by-expires', 'expiresAt');
        }
        if (!db.objectStoreNames.contains('inventoryVersions')) {
          const s = db.createObjectStore('inventoryVersions', { keyPath: 'id' });
          s.createIndex('by-product', 'productId');
        }
        if (!db.objectStoreNames.contains('reconciliationLogs')) {
          const s = db.createObjectStore('reconciliationLogs', { keyPath: 'id' });
          s.createIndex('by-store', 'storeId');
          s.createIndex('by-type', 'type');
        }
        if (!db.objectStoreNames.contains('integrityChecks')) {
          const s = db.createObjectStore('integrityChecks', { keyPath: 'id' });
          s.createIndex('by-status', 'status');
        }
        if (!db.objectStoreNames.contains('snapshots')) {
          const s = db.createObjectStore('snapshots', { keyPath: 'id' });
          s.createIndex('by-created', 'createdAt');
        }
        if (!db.objectStoreNames.contains('orphanLog')) {
          db.createObjectStore('orphanLog', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('clientAudit')) {
          const s = db.createObjectStore('clientAudit', { keyPath: 'id' });
          s.createIndex('by-event', 'event');
          s.createIndex('by-correlation', 'correlationId');
          s.createIndex('by-created', 'createdAt');
        }
        if (!db.objectStoreNames.contains('products')) {
          const s = db.createObjectStore('products', { keyPath: 'id' });
          s.createIndex('by-sku', 'sku');
        }
        if (!db.objectStoreNames.contains('sales')) {
          const s = db.createObjectStore('sales', { keyPath: 'id' });
          s.createIndex('by-idempotency', 'idempotency_key');
        }
        if (!db.objectStoreNames.contains('metrics')) {
          const s = db.createObjectStore('metrics', { keyPath: 'id' });
          s.createIndex('by-name', 'name');
          s.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('alerts')) {
          const s = db.createObjectStore('alerts', { keyPath: 'id' });
          s.createIndex('by-rule', 'rule');
          s.createIndex('by-status', 'status');
          s.createIndex('by-severity', 'severity');
        }
        if (!db.objectStoreNames.contains('checksums')) {
          const s = db.createObjectStore('checksums', { keyPath: 'productId' });
          s.createIndex('by-product', 'productId');
        }
        if (!db.objectStoreNames.contains('reconciliationSnapshots')) {
          const s = db.createObjectStore('reconciliationSnapshots', { keyPath: 'id' });
          s.createIndex('by-store', 'storeId');
          s.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('reconciliationJobs')) {
          const s = db.createObjectStore('reconciliationJobs', { keyPath: 'id' });
          s.createIndex('by-store', 'storeId');
          s.createIndex('by-status', 'status');
        }
        if (!db.objectStoreNames.contains('apiCache')) {
          const s = db.createObjectStore('apiCache', { keyPath: 'request' });
          s.createIndex('by-tag', 'tags', { multiEntry: true });
          s.createIndex('by-updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('syncLog')) {
          const s = db.createObjectStore('syncLog', { keyPath: 'id' });
          s.createIndex('by-idempotency', 'idempotencyKey');
          s.createIndex('by-correlation', 'correlationId');
          s.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('conflicts')) {
          const s = db.createObjectStore('conflicts', { keyPath: 'id' });
          s.createIndex('by-product', 'productId');
          s.createIndex('by-resolved', 'resolved');
        }
        if (!db.objectStoreNames.contains('inventoryMovements')) {
          const s = db.createObjectStore('inventoryMovements', { keyPath: 'id' });
          s.createIndex('by-product', 'product_id');
          s.createIndex('by-synced', 'synced');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
      blocked() { console.warn('[DB] Blocked by other tab'); },
      blocking() { console.warn('[DB] Close other tabs to upgrade'); },
      terminated() {
        console.error('[DB] Connection terminated');
        dbPromise = null;
      },
    }).catch((err) => {
      console.error('[DB] Open failed:', err);
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

export async function closeDB(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}

// ─── Legacy helpers ───

export async function saveOfflineSale(sale: OfflineSale): Promise<void> {
  const db = await getDB();
  await db.put('offlineSales', sale);
}

export async function getUnsyncedSales(): Promise<OfflineSale[]> {
  const db = await getDB();
  return db.transaction('offlineSales').store.index('by-synced').getAll(0);
}

export async function markSaleSynced(id: string): Promise<void> {
  const db = await getDB();
  const sale = await db.get('offlineSales', id);
  if (sale) {
    sale.synced = true as any;
    await db.put('offlineSales', sale);
  }
}

export async function getUnsyncedMovements(): Promise<OfflineInventoryMovement[]> {
  const db = await getDB();
  return db.transaction('offlineMovements').store.index('by-synced').getAll(0);
}

export async function markMovementSynced(id: string): Promise<void> {
  const db = await getDB();
  const mov = await db.get('offlineMovements', id);
  if (mov) {
    mov.synced = true as any;
    await db.put('offlineMovements', mov);
  }
}

export async function persistCart(cart: CartPersist): Promise<void> {
  const db = await getDB();
  await db.put('cartPersist', cart);
}

export async function getPersistedCart(): Promise<CartPersist | undefined> {
  const db = await getDB();
  return db.get('cartPersist', 'current');
}

export async function removePersistedCart(): Promise<void> {
  const db = await getDB();
  await db.delete('cartPersist', 'current');
}

export async function getAllOfflineSales(): Promise<OfflineSale[]> {
  const db = await getDB();
  return db.getAll('offlineSales');
}

export async function cacheApiResponse(request: string, method: string, response: any, tags: string[] = []): Promise<void> {
  const db = await getDB();
  const record = {
    request,
    method,
    response,
    tags,
    updatedAt: Date.now(),
  } as ApiCacheEntry;
  await db.put('apiCache', record);
}

export async function getApiCache(request: string): Promise<ApiCacheEntry | undefined> {
  const db = await getDB();
  return db.get('apiCache', request);
}

export async function getApiCacheByTag(tag: string): Promise<ApiCacheEntry[]> {
  const db = await getDB();
  return db.transaction('apiCache').store.index('by-tag').getAll(tag);
}

export async function getApiCacheByPrefix(prefix: string): Promise<ApiCacheEntry[]> {
  const db = await getDB();
  const all = await db.getAll('apiCache');
  return all.filter((entry) => entry.request.startsWith(prefix));
}

// ─── DB Health ───

export async function checkDBHealth(): Promise<{
  ok: boolean;
  latencyMs: number;
  storeCounts: Record<string, number>;
  error: string | null;
}> {
  const start = performance.now();
  try {
    const db = await getDB();
    const counts: Record<string, number> = {};
    for (const name of Array.from(db.objectStoreNames)) {
      counts[name] = await db.count(name);
    }
    return { ok: true, latencyMs: performance.now() - start, storeCounts: counts, error: null };
  } catch (e) {
    return {
      ok: false,
      latencyMs: performance.now() - start,
      storeCounts: {},
      error: e instanceof Error ? e.message : 'Unknown DB error',
    };
  }
}
