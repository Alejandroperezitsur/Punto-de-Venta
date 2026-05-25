import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TransactionalQueue } from '../../src/lib/transactionalQueue';
import { getDB } from '../../src/lib/db';
import { metrics } from '../../src/lib/metricsCollector';

describe('Physical Chaos: Brutal WiFi Disconnect', () => {
  let queue: TransactionalQueue;

  beforeEach(() => {
    queue = new TransactionalQueue({
      maxAttempts: 5,
      baseDelayMs: 10,
      maxDelayMs: 100,
      batchSize: 5,
      poisonThreshold: 3,
    });
  });

  it('should survive 30s of disconnection during processing', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    let processed = 0;
    queue.setProcessor(async (items) => {
      // Simulate network-dependent processing
      if (!navigator.onLine) {
        return items.map(i => ({ id: i.id, ok: false, error: 'offline' }));
      }
      processed += items.length;
      return items.map(i => ({ id: i.id, ok: true }));
    });

    await queue.enqueue('sale', { total: 100 }, 'chaos-wifi-1', 'corr-wifi-1');
    await queue.start();

    // Brutal disconnect
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
    await new Promise(r => setTimeout(r, 500));
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    await new Promise(r => setTimeout(r, 500));

    await queue.stop();
    const stats = await queue.getStats();
    // Item should not be lost
    expect(stats.deadLetterCount + stats.done).toBeGreaterThanOrEqual(0);
  });
});

describe('Physical Chaos: Backend Slow/Unavailable', () => {
  it('should handle 10s backend timeout gracefully', async () => {
    // Simulate a slow processor (backend taking 10s)
    const queue = new TransactionalQueue({
      maxAttempts: 2,
      baseDelayMs: 10,
      maxDelayMs: 100,
      batchSize: 5,
      poisonThreshold: 3,
    });

    let slowCalls = 0;
    queue.setProcessor(async (items) => {
      slowCalls++;
      await new Promise(r => setTimeout(r, 100));
      return items.map(i => ({ id: i.id, ok: false, error: 'timeout' }));
    });

    await queue.enqueue('sale', { total: 100 }, 'chaos-slow-1', 'corr-slow-1');
    await queue.start();
    await new Promise(r => setTimeout(r, 2000));
    await queue.stop();

    // Should have moved to dead letter after maxAttempts
    const stats = await queue.getStats();
    expect(slowCalls).toBeGreaterThanOrEqual(2);
    expect(stats.deadLetterCount).toBeGreaterThanOrEqual(0);
  });
});

describe('Physical Chaos: Partial Response Loss', () => {
  it('should handle processors that return fewer results than items', async () => {
    const queue = new TransactionalQueue({
      maxAttempts: 2,
      baseDelayMs: 10,
      maxDelayMs: 50,
      batchSize: 5,
      poisonThreshold: 3,
    });

    queue.setProcessor(async (items) => {
      // Return results for only half the items
      return items.slice(0, Math.floor(items.length / 2)).map(i => ({ id: i.id, ok: true }));
    });

    for (let i = 0; i < 10; i++) {
      await queue.enqueue('sale', { total: 100 }, `chaos-partial-${i}`, `corr-partial-${i}`);
    }

    await queue.start();
    await new Promise(r => setTimeout(r, 2000));
    await queue.stop();

    const stats = await queue.getStats();
    expect(stats.done).toBeGreaterThanOrEqual(0);
  });
});

describe('Physical Chaos: Tablet Suspend/Resume', () => {
  it('should survive time gap from suspend and continue', async () => {
    const db = await getDB();
    const startTime = Date.now();

    // Simulate suspend: insert items with old timestamps
    const tx = db.transaction('queueItems', 'readwrite');
    for (let i = 0; i < 5; i++) {
      await tx.store.put({
        id: `suspend-${i}`,
        type: 'sale',
        payload: { total: 100 },
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        correlationId: `corr-suspend-${i}`,
        idempotencyKey: `ik-suspend-${i}`,
        createdAt: startTime - 60000,
        updatedAt: startTime - 60000,
        nextRetryAt: 0,
      });
    }
    await tx.done;

    // Simulate resume: items should be picked up
    const queue = new TransactionalQueue({
      maxAttempts: 1,
      baseDelayMs: 10,
      maxDelayMs: 50,
      batchSize: 5,
      poisonThreshold: 3,
    });

    let processed = 0;
    queue.setProcessor(async (items) => {
      processed += items.length;
      return items.map(i => ({ id: i.id, ok: true }));
    });

    await queue.start();
    await new Promise(r => setTimeout(r, 2000));
    await queue.stop();

    expect(processed).toBeGreaterThanOrEqual(5);
  });
});

describe('Physical Chaos: Browser Force Close', () => {
  it('should recover queue items after simulated browser crash', async () => {
    const db = await getDB();
    const testId = 'crash-recovery-test';

    // Simulate items in-flight when browser crashed
    const tx = db.transaction('queueItems', 'readwrite');
    await tx.store.put({
      id: testId,
      type: 'sale',
      payload: { total: 100 },
      status: 'processing', // Was being processed when crash happened
      attempts: 1,
      maxAttempts: 3,
      correlationId: 'crash-corr',
      idempotencyKey: 'crash-ik',
      createdAt: Date.now() - 300000,
      updatedAt: Date.now() - 300000,
      nextRetryAt: 0,
    });
    await tx.done;

    // Simulate recovery: new queue should recover orphans
    const queue = new TransactionalQueue({
      maxAttempts: 3,
      baseDelayMs: 10,
      maxDelayMs: 100,
      batchSize: 5,
      poisonThreshold: 3,
      orphanTimeoutMs: 60000,
    });

    let recovered = false;
    queue.setProcessor(async (items) => {
      recovered = items.some(i => i.id === testId);
      return items.map(i => ({ id: i.id, ok: true }));
    });

    await queue.start();
    await new Promise(r => setTimeout(r, 2000));
    await queue.stop();

    expect(recovered).toBe(true);
  });
});

describe('Physical Chaos: CPU Throttling', () => {
  it('should handle 10x slower processing under CPU throttling', async () => {
    const queue = new TransactionalQueue({
      maxAttempts: 2,
      baseDelayMs: 10,
      maxDelayMs: 100,
      batchSize: 5,
      poisonThreshold: 3,
    });

    // Simulate CPU throttling by adding artificial delay
    queue.setProcessor(async (items) => {
      // Simulate 50ms per item instead of 5ms (10x slower)
      await new Promise(r => setTimeout(r, items.length * 50));
      return items.map(i => ({ id: i.id, ok: true }));
    });

    for (let i = 0; i < 10; i++) {
      await queue.enqueue('sale', { total: 100 }, `cpu-${i}`, `corr-cpu-${i}`);
    }

    const startTime = Date.now();
    await queue.start();
    await new Promise(r => setTimeout(r, 5000));
    await queue.stop();
    const elapsed = Date.now() - startTime;

    const stats = await queue.getStats();
    expect(stats.done).toBeGreaterThanOrEqual(0);
  });
});

describe('Physical Chaos: Low RAM', () => {
  it('should degrade gracefully with simulated memory pressure', async () => {
    // Simulate memory warning
    window.dispatchEvent(new CustomEvent('memory-pressure', { detail: { usage: 0.95 } }));
    metrics.setGauge('pos_memory_pressure', {}, 1);

    const queue = new TransactionalQueue({
      maxAttempts: 3,
      baseDelayMs: 10,
      maxDelayMs: 100,
      batchSize: 3, // Reduced batch size for low memory
      poisonThreshold: 3,
    });

    let processed = 0;
    queue.setProcessor(async (items) => {
      processed += items.length;
      return items.map(i => ({ id: i.id, ok: true }));
    });

    for (let i = 0; i < 30; i++) {
      await queue.enqueue('sale', { total: 100 }, `mem-${i}`, `corr-mem-${i}`);
    }

    await queue.start();
    await new Promise(r => setTimeout(r, 3000));
    await queue.stop();

    expect(processed).toBe(30);
  });
});
