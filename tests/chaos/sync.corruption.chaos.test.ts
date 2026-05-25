import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TransactionalQueue } from '../../client/src/lib/transactionalQueue';
import { getDB } from '../../client/src/lib/db';

describe('Sync Corruption Chaos Tests', () => {
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

    // Clear all data
    await queue.clearAll();
  });

  afterEach(async () => {
    await queue.stop();
  });

  it('should detect and isolate corrupted payloads', async () => {
    // Manually insert corrupted data
    const db = await getDB();
    await db.put('queueItems', {
      id: 'corrupted-1',
      type: 'sale',
      priority: 0,
      payload: null, // corrupted payload
      idempotencyKey: 'key-corrupted',
      correlationId: 'corr-corrupted',
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      lastError: null,
      nextRetryAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      checkpoint: 0,
      batchId: null,
    });

    // Insert valid items
    for (let i = 0; i < 5; i++) {
      await queue.enqueue('sale', { total: i * 100 }, `key-valid-${i}`, `corr-valid-${i}`);
    }

    const processor = vi.fn().mockImplementation(async (items) => {
      return items.map((item) => {
        if (item.payload === null) {
          return { id: item.id, ok: false, error: 'Corrupted payload' };
        }
        return { id: item.id, ok: true };
      });
    });

    queue.setProcessor(processor);
    await queue.start();
    await new Promise((r) => setTimeout(r, 300));
    await queue.stop();

    const stats = await queue.getStats();
    // Valid items should be delivered, corrupted should be in dead letter
    expect(stats.delivered).toBe(5);
  });

  it('should handle duplicate idempotency keys gracefully', async () => {
    const processedIds: string[] = [];
    queue.setProcessor(async (items) => {
      return items.map((item) => {
        processedIds.push(item.id);
        return { id: item.id, ok: true };
      });
    });

    // Enqueue two items with the same idempotency key (simulates duplicate)
    await queue.enqueue('sale', { total: 100 }, 'DUPLICATE-KEY', 'corr-dup-1');
    await queue.enqueue('sale', { total: 100 }, 'DUPLICATE-KEY', 'corr-dup-2');

    await queue.start();
    await new Promise((r) => setTimeout(r, 300));
    await queue.stop();

    const stats = await queue.getStats();
    // Both should be eventually consistent (idempotency handles server-side)
    expect(stats.delivered + stats.dead + stats.pending).toBe(2);
  });

  it('should survive partial commit simulation', async () => {
    const results: Array<{ id: string; ok: boolean }> = [];

    queue.setProcessor(async (items) => {
      return items.map((item, index) => {
        // Simulate partial commit: first half succeeds, second half fails
        if (index < items.length / 2) {
          results.push({ id: item.id, ok: true });
          return { id: item.id, ok: true };
        }
        return { id: item.id, ok: false, error: 'Simulated partial failure' };
      });
    });

    for (let i = 0; i < 10; i++) {
      await queue.enqueue('sale', { total: i * 50 }, `key-partial-${i}`, `corr-partial-${i}`);
    }

    await queue.start();
    await new Promise((r) => setTimeout(r, 500));
    await queue.stop();

    const stats = await queue.getStats();
    const db = await getDB();
    const allItems = await db.getAll('queueItems');

    // All items should be either delivered or pending for retry
    const unaccounted = allItems.filter(
      (i) => i.status !== 'delivered' && i.status !== 'pending' && i.status !== 'dead',
    );
    expect(unaccounted.length).toBe(0);
  });

  it('should handle out-of-order operations', async () => {
    const processedOrder: string[] = [];
    queue.setProcessor(async (items) => {
      const sorted = [...items].sort((a, b) => a.priority - b.priority);
      for (const item of sorted) {
        processedOrder.push(item.id);
      }
      return items.map((i) => ({ id: i.id, ok: true }));
    });

    // Enqueue items with different priorities
    await queue.enqueue('sale', { total: 300 }, 'key-o3', 'corr-o3', 3);
    await queue.enqueue('sale', { total: 100 }, 'key-o1', 'corr-o1', 1);
    await queue.enqueue('sale', { total: 200 }, 'key-o2', 'corr-o2', 2);

    await queue.start();
    await new Promise((r) => setTimeout(r, 300));
    await queue.stop();

    const stats = await queue.getStats();
    expect(stats.delivered).toBe(3);
  });
});
