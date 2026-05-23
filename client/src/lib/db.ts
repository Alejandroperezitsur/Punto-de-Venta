import { openDB, type IDBPDatabase, type DBSchema } from 'idb';

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

interface POSDB extends DBSchema {
  offlineSales: {
    key: string;
    value: OfflineSale;
    indexes: { 'by-synced': boolean; 'by-date': Date };
  };
  offlineMovements: {
    key: string;
    value: OfflineInventoryMovement;
    indexes: { 'by-synced': boolean };
  };
  cartPersist: {
    key: string;
    value: CartPersist;
  };
}

const DB_NAME = 'pos-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<POSDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<POSDB>> {
  if (!dbPromise) {
    dbPromise = openDB<POSDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('offlineSales')) {
          const saleStore = db.createObjectStore('offlineSales', { keyPath: 'id' });
          saleStore.createIndex('by-synced', 'synced');
          saleStore.createIndex('by-date', 'created_at');
        }
        if (!db.objectStoreNames.contains('offlineMovements')) {
          const movStore = db.createObjectStore('offlineMovements', { keyPath: 'id' });
          movStore.createIndex('by-synced', 'synced');
        }
        if (!db.objectStoreNames.contains('cartPersist')) {
          db.createObjectStore('cartPersist', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveOfflineSale(sale: OfflineSale): Promise<void> {
  const db = await getDB();
  await db.put('offlineSales', sale);
}

export async function getUnsyncedSales(): Promise<OfflineSale[]> {
  const db = await getDB();
  const index = db.transaction('offlineSales').store.index('by-synced');
  return index.getAll(false);
}

export async function markSaleSynced(id: string): Promise<void> {
  const db = await getDB();
  const sale = await db.get('offlineSales', id);
  if (sale) {
    sale.synced = true;
    await db.put('offlineSales', sale);
  }
}

export async function getUnsyncedMovements(): Promise<OfflineInventoryMovement[]> {
  const db = await getDB();
  const index = db.transaction('offlineMovements').store.index('by-synced');
  return index.getAll(false);
}

export async function markMovementSynced(id: string): Promise<void> {
  const db = await getDB();
  const mov = await db.get('offlineMovements', id);
  if (mov) {
    mov.synced = true;
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
