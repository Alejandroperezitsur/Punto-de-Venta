import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TransactionalQueue } from '../../client/src/lib/transactionalQueue';
import { getDB } from '../../client/src/lib/db';

describe('Offline Chaos Tests', () => {
  let queue: TransactionalQueue;

  beforeEach(async () => {
    queue = new TransactionalQueue({
      maxAttempts: 2,
      baseDelayMs: 10,
      maxDelayMs: 100,
      batchSize: 10,
      poisonThreshold: 2,
      orphanTimeoutMs: 50,
    });
    await queue.clearAll();
  });

  afterEach(async () => {
    await queue.stop();
  });

  it('should accumulate items while offline and sync when online', async () => {
    // Simulate offline mode
    const originalOnline = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

    const processed: string[] = [];
    queue.setProcessor(async (items) => {
      processed.push(...items.map((i) => i.id));
      return items.map((i) => ({ id: i.id, ok: true }));
    });

    // Enqueue 10 items while "offline"
    for (let i = 0; i < 10; i++) {
      await queue.enqueue('sale', { total: i * 50 }, `key-off-${i}`, `corr-off-${i}`);
    }

    // Items should be pending
    let stats = await queue.getStats();
    expect(stats.pending).toBe(10);

    // Go "online" and process
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    await queue.start();
    await new Promise((r) => setTimeout(r, 500));
    await queue.stop();

    stats = await queue.getStats();
    expect(stats.delivered).toBe(10);

    // Restore
    Object.defineProperty(navigator, 'onLine', { value: originalOnline, writable: true });
  });

  it('should survive rapid online/offline toggles (reconnect storm)', async () => {
    // Simulate reconnect storm: rapid online/offline toggles
    const originalOnline = navigator.onLine;

    let callCount = 0;
    queue.setProcessor(async (items) => {
      callCount++;
      await new Promise((r) => setTimeout(r, 20));
      return items.map((i) => ({ id: i.id, ok: true }));
    });

    // Enqueue items
    for (let i = 0; i < 5; i++) {
      await queue.enqueue('sale', { total: i * 100 }, `key-storm-${i}`, `corr-storm-${i}`);
    }

    // Start processing
    await queue.start();

    // Rapidly toggle online/offline
    for (let i = 0; i < 20; i++) {
      const val = i % 2 === 0;
      Object.defineProperty(navigator, 'onLine', { value: val, writable: true });
      await new Promise((r) => setTimeout(r, 5));
    }

    await new Promise((r) => setTimeout(r, 500));
    await queue.stop();

    // All items should still be accounted for
    const db = await getDB();
    const allItems = await db.getAll('queueItems');
    const delivered = allItems.filter((i) => i.status === 'delivered').length;
    const pending = allItems.filter((i) => i.status === 'pending').length;

    expect(delivered + pending).toBe(5);

    // Restore
    Object.defineProperty(navigator, 'onLine', { value: originalOnline, writable: true });
  });

  it('should handle massive offline batch (100 items)', async () => {
    const processed: string[] = [];
    queue.setProcessor(async (items) => {
      processed.push(...items.map((i) => i.id));
      return items.map((i) => ({ id: i.id, ok: true }));
    });

    // Enqueue 100 items
    for (let i = 0; i < 100; i++) {
      await queue.enqueue('sale', { total: i * 10 }, `key-mass-${i}`, `corr-mass-${i}`);
    }

    await queue.start();
    await new Promise((r) => setTimeout(r, 1000));
    await queue.stop();

    const stats = await queue.getStats();
    expect(stats.delivered).toBe(100);
  });

  it('should handle timeouts gracefully', async () => {
    let slowProcessed = false;
    queue.setProcessor(async (items) => {
      // First few items are slow
      if (!slowProcessed) {
        slowProcessed = true;
        await new Promise((r) => setTimeout(r, 500));
        return items.map((i) => ({ id: i.id, ok: true }));
      }
      return items.map((i) => ({ id: i.id, ok: true }));
    });

    for (let i = 0; i < 3; i++) {
      await queue.enqueue('sale', { total: i * 100 }, `key-timeout-${i}`, `corr-timeout-${i}`);
    }

    await queue.start();
    await new Promise((r) => setTimeout(r, 1000));
    await queue.stop();

    const db = await getDB();
    const allItems = await db.getAll('queueItems');
    const delivered = allItems.filter((i) => i.status === 'delivered').length;
    expect(delivered).toBe(3);
  });

  it('should not lose items on queue stop during processing', async () => {
    let processingStarted = false;
    const processingPromise = new Promise<void>((resolve) => {
      queue.setProcessor(async (items) => {
        processingStarted = true;
        await new Promise((r) => setTimeout(r, 100));
        resolve();
        return items.map((i) => ({ id: i.id, ok: false, error: 'Stopped mid-process' }));
      });
    });

    await queue.enqueue('sale', { total: 100 }, 'key-stop', 'corr-stop');
    await queue.start();

    // Wait for processing to start, then stop abruptly
    await new Promise((r) => setTimeout(r, 50));
    await queue.stop();

    // Item should still exist, not lost
    const db = await getDB();
    const allItems = await db.getAll('queueItems');
    expect(allItems.length).toBeGreaterThanOrEqual(1);
  });
});
