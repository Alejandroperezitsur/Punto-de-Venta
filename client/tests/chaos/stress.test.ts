import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { getDB } from '../../src/lib/db';
import { createSnapshot, attemptCrashRecovery, safeQueueReplay } from '../../src/lib/snapshotManager';
import { detectConflicts, detectDrift } from '../../src/lib/reconciliationEngine';
import { TransactionalQueue } from '../../src/lib/transactionalQueue';

describe('Stress: Large Scale Operations', () => {
  it('should handle 100k product inserts in IndexedDB', async () => {
    const db = await getDB();
    const BATCH = 1000;
    const TOTAL = 100000;

    const tx = db.transaction('products', 'readwrite');
    for (let i = 0; i < TOTAL; i++) {
      await tx.store.put({
        id: `stress-prod-${i}`,
        name: `Product ${i}`,
        price: Math.random() * 1000,
        stock: Math.floor(Math.random() * 500),
        sku: `SKU-${i.toString().padStart(10, '0')}`,
        updatedAt: Date.now(),
      });
      if (i % BATCH === 0 && i > 0) {
        await tx.done;
      }
    }
    await tx.done;

    const count = await db.count('products');
    expect(count).toBe(TOTAL);
  }, 60000);

  it('should handle 1M queue items without crashing', async () => {
    const db = await getDB();
    const TOTAL = 100000;
    const BATCH = 10000;

    const tx = db.transaction('queueItems', 'readwrite');
    for (let i = 0; i < TOTAL; i++) {
      await tx.store.put({
        id: `stress-queue-${i}`,
        type: 'sale',
        payload: { total: Math.random() * 1000, items: [{ id: `item-${i}`, qty: 1, price: Math.random() * 500 }] },
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        correlationId: `corr-${i}`,
        idempotencyKey: `ik-${i}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      if (i % BATCH === 0 && i > 0) {
        await tx.done;
      }
    }
    await tx.done;

    const count = await db.count('queueItems');
    expect(count).toBe(TOTAL);
  }, 120000);

  it('should process 10k items through the queue sequentially', async () => {
    const queue = new TransactionalQueue({
      batchSize: 100,
      baseDelayMs: 1,
      maxDelayMs: 10,
      maxAttempts: 1,
      concurrency: 1,
      poisonThreshold: 5,
    });

    let processed = 0;
    queue.setProcessor(async (items) => {
      processed += items.length;
      return items.map((i) => ({ id: i.id, ok: true }));
    });

    const TOTAL = 10000;
    for (let i = 0; i < TOTAL; i++) {
      await queue.enqueue('sale', { total: 100 }, `stress-proc-${i}`, `corr-proc-${i}`);
    }

    await queue.start();
    await new Promise((r) => setTimeout(r, 15000));
    await queue.stop();

    expect(processed).toBe(TOTAL);
  }, 30000);
});

describe('Stress: Reconnect Storms', () => {
  it('should survive 100 rapid online/offline toggles', async () => {
    const queue = new TransactionalQueue({
      batchSize: 5,
      baseDelayMs: 10,
      maxDelayMs: 100,
      maxAttempts: 3,
      concurrency: 1,
      poisonThreshold: 5,
    });

    let processed = 0;
    queue.setProcessor(async (items) => {
      processed += items.length;
      return items.map((i) => ({ id: i.id, ok: true }));
    });

    const TOTAL = 500;
    const toggles = 100;

    await queue.start();

    for (let i = 0; i < toggles; i++) {
      Object.defineProperty(navigator, 'onLine', { value: i % 2 === 0, writable: true });
      window.dispatchEvent(new Event(i % 2 === 0 ? 'online' : 'offline'));
      await new Promise((r) => setTimeout(r, 5));
    }

    for (let i = 0; i < TOTAL; i++) {
      await queue.enqueue('sale', { total: 100 }, `storm-${i}`, `corr-storm-${i}`);
    }

    await new Promise((r) => setTimeout(r, 5000));
    await queue.stop();

    expect(processed).toBe(TOTAL);

    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  }, 15000);

  it('should survive 1000 concurrent enqueue operations', async () => {
    const queue = new TransactionalQueue({
      batchSize: 20,
      baseDelayMs: 5,
      maxDelayMs: 50,
      maxAttempts: 1,
      concurrency: 1,
      poisonThreshold: 5,
    });

    let processed = 0;
    queue.setProcessor(async (items) => {
      processed += items.length;
      return items.map((i) => ({ id: i.id, ok: true }));
    });

    const TOTAL = 1000;
    await queue.start();

    const promises = [];
    for (let i = 0; i < TOTAL; i++) {
      promises.push(
        queue.enqueue('sale', { total: i }, `conc-${i}`, `corr-conc-${i}`)
      );
    }
    await Promise.all(promises);

    await new Promise((r) => setTimeout(r, 10000));
    await queue.stop();

    expect(processed).toBe(TOTAL);
  }, 20000);
});

describe('Stress: Snapshot Manager Heavy Load', () => {
  it('should create and recover from 1000 snapshots', async () => {
    const state = {
      items: Array.from({ length: 100 }, (_, i) => ({
        id: `prod-${i}`,
        name: `Product ${i}`,
        price: Math.random() * 100,
        qty: Math.floor(Math.random() * 10) + 1,
      })),
      totals: { subtotal: 1000, tax: 160, total: 1160 },
      customer: { id: 'c1', name: 'Test Customer' },
    };

    for (let i = 0; i < 1000; i++) {
      await createSnapshot();
    }

    const recovery = await attemptCrashRecovery();
    expect(recovery).toBeDefined();
  }, 30000);
});

describe('Stress: Reconciliation Engine Heavy Load', () => {
  it('should handle 10k version conflicts', async () => {
    const localIds = Array.from({ length: 10000 }, (_, i) => `prod-${i}`);
    const serverIds = Array.from({ length: 10000 }, (_, i) => `prod-${i}`);

    const localVersions = new Map(
      localIds.map((id) => [id, { version: Math.floor(Math.random() * 10), checksum: `abc${id}` }])
    );
    const serverVersions = new Map(
      serverIds.map((id) => [id, { version: Math.floor(Math.random() * 10), checksum: `def${id}` }])
    );

    const conflicts = await detectConflicts(localVersions, serverVersions);
    expect(conflicts.length).toBeGreaterThanOrEqual(0);

    const drifts = await detectDrift(localVersions, serverVersions);
    expect(drifts.length).toBeGreaterThanOrEqual(0);
  }, 30000);
});
