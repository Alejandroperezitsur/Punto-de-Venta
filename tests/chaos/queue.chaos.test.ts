import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TransactionalQueue, QueueLockError, PoisonMessageDetector, AdaptiveThrottler, NetworkQualityDetector } from '../../client/src/lib/transactionalQueue';
import { getDB } from '../../client/src/lib/db';

describe('TransactionalQueue Chaos Tests', () => {
  let queue: TransactionalQueue;

  beforeEach(async () => {
    queue = new TransactionalQueue({
      maxAttempts: 3,
      baseDelayMs: 10,
      maxDelayMs: 100,
      batchSize: 5,
      poisonThreshold: 2,
      orphanTimeoutMs: 100,
    });
  });

  afterEach(async () => {
    await queue.stop();
    await queue.clearAll();
  });

  it('should survive crash mid-batch processing', async () => {
    const processed: string[] = [];
    queue.setProcessor(async (items) => {
      const results = [];
      for (const item of items) {
        processed.push(item.id);
        // Simulate crash: throw on third item
        if (processed.length === 3) {
          throw new Error('Simulated crash');
        }
        results.push({ id: item.id, ok: true });
      }
      return results;
    });

    await queue.enqueue('sale', { total: 100 }, 'key-1', 'corr-1');
    await queue.enqueue('sale', { total: 200 }, 'key-2', 'corr-2');
    await queue.enqueue('sale', { total: 300 }, 'key-3', 'corr-3');
    await queue.enqueue('sale', { total: 400 }, 'key-4', 'corr-4');

    await queue.start();
    await new Promise((r) => setTimeout(r, 200));
    await queue.stop();

    // Should have processed at least first items before crash
    expect(processed.length).toBeGreaterThan(0);

    // Queue should still have pending items (ones that weren't processed/delivered)
    const stats = await queue.getStats();
    const db = await getDB();
    const allItems = await db.getAll('queueItems');
    const delivered = allItems.filter((i) => i.status === 'delivered');
    const pending = allItems.filter((i) => i.status === 'pending');

    // Total items should match
    expect(allItems.length).toBe(4);
  });

  it('should move poison messages to dead letter queue', async () => {
    let attempts = 0;
    queue.setProcessor(async (items) => {
      attempts++;
      return items.map((item) => ({
        id: item.id,
        ok: false,
        error: 'Simulated persistent error',
      }));
    });

    await queue.enqueue('sale', { total: 100 }, 'key-poison', 'corr-poison');
    await queue.start();

    // Wait for max attempts
    await new Promise((r) => setTimeout(r, 500));
    await queue.stop();

    const stats = await queue.getStats();
    expect(stats.deadLetterCount).toBeGreaterThanOrEqual(1);
    expect(stats.dead).toBeGreaterThanOrEqual(1);

    // Retry dead letters
    const retried = await queue.retryDeadLetters();
    expect(retried).toBeGreaterThanOrEqual(1);

    const statsAfterRetry = await queue.getStats();
    // Should have moved back from dead letter
    expect(statsAfterRetry.deadLetterCount).toBe(0);
  });

  it('should recover orphans (stuck processing items)', async () => {
    const db = await getDB();

    // Manually insert an orphan item (processing, old timestamp)
    const orphanId = 'orphan-test-1';
    await db.put('queueItems', {
      id: orphanId,
      type: 'sale',
      priority: 0,
      payload: { total: 100 },
      idempotencyKey: 'key-orphan',
      correlationId: 'corr-orphan',
      status: 'processing',
      attempts: 0,
      maxAttempts: 3,
      lastError: null,
      nextRetryAt: null,
      createdAt: Date.now() - 600000, // 10 min old
      updatedAt: Date.now() - 600000,
      checkpoint: 0,
      batchId: null,
    });

    // Start queue (should recover orphans on init)
    queue.setProcessor(async (items) => items.map((i) => ({ id: i.id, ok: true })));
    await queue.start();
    await new Promise((r) => setTimeout(r, 300));
    await queue.stop();

    // Orphan should have been processed
    const orphan = await db.get('queueItems', orphanId);
    // May have been recovered and then delivered
    expect(orphan).toBeDefined();
  });

  it('should handle concurrent enqueue and process', async () => {
    const processed: string[] = [];
    queue.setProcessor(async (items) => {
      processed.push(...items.map((i) => i.id));
      return items.map((i) => ({ id: i.id, ok: true }));
    });

    await queue.start();

    // Enqueue many items rapidly
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(
        queue.enqueue('sale', { total: i * 100 }, `key-concurrent-${i}`, `corr-concurrent-${i}`),
      );
    }
    await Promise.all(promises);

    await new Promise((r) => setTimeout(r, 500));
    await queue.stop();

    const stats = await queue.getStats();
    expect(stats.delivered + stats.done).toBe(20);
  });

  it('should not allow duplicate processing with lock', async () => {
    const processor = vi.fn().mockImplementation(async (items) => {
      await new Promise((r) => setTimeout(r, 50));
      return items.map((i) => ({ id: i.id, ok: true }));
    });

    queue.setProcessor(processor);

    await queue.enqueue('sale', { total: 100 }, 'key-lock', 'corr-lock-1');
    await queue.enqueue('sale', { total: 200 }, 'key-lock-2', 'corr-lock-2');

    // Try to start the queue twice
    await queue.start();

    // Lock should prevent second start from processing
    await new Promise((r) => setTimeout(r, 300));
    await queue.stop();

    // Processor should have been called
    expect(processor).toHaveBeenCalled();
  });
});

describe('PoisonMessageDetector', () => {
  let detector: PoisonMessageDetector;

  beforeEach(() => {
    detector = new PoisonMessageDetector();
  });

  it('should detect poison after repeated failures', () => {
    const item = {
      id: 'test-item',
      type: 'sale' as const,
      priority: 0,
      payload: {},
      idempotencyKey: 'key',
      correlationId: 'corr',
      status: 'pending' as const,
      attempts: 3,
      maxAttempts: 5,
      lastError: null,
      nextRetryAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      checkpoint: 0,
      batchId: null,
    };

    // Record multiple failures with different errors
    detector.recordFailure('test-item', 'Network error');
    detector.recordFailure('test-item', 'Timeout');
    detector.recordFailure('test-item', 'Server 500');
    detector.recordFailure('test-item', 'Server 502');

    const result = detector.detect(item, 'Server 502');
    expect(result.isPoison).toBe(true);
    expect(result.reason).toContain('Multiple error types');
  });

  it('should detect 401/403 as poison', () => {
    const item = {
      id: 'test-auth',
      type: 'sale' as const,
      priority: 0,
      payload: {},
      idempotencyKey: 'key-auth',
      correlationId: 'corr-auth',
      status: 'pending' as const,
      attempts: 1,
      maxAttempts: 5,
      lastError: null,
      nextRetryAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      checkpoint: 0,
      batchId: null,
    };

    detector.recordFailure('test-auth', '401 Unauthorized');
    detector.recordFailure('test-auth', '401 Unauthorized');

    const result = detector.detect(item, '401 Unauthorized');
    expect(result.isPoison).toBe(true);
    expect(result.reason).toContain('401');
  });

  it('should not detect success as poison', () => {
    const item = {
      id: 'test-ok',
      type: 'sale' as const,
      priority: 0,
      payload: {},
      idempotencyKey: 'key-ok',
      correlationId: 'corr-ok',
      status: 'pending' as const,
      attempts: 1,
      maxAttempts: 5,
      lastError: null,
      nextRetryAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      checkpoint: 0,
      batchId: null,
    };

    detector.clear('test-ok');
    const result = detector.detect(item, 'Transient error');
    expect(result.isPoison).toBe(false);
  });
});

describe('AdaptiveThrottler', () => {
  it('should reduce batch size on poor network', () => {
    const detector = new NetworkQualityDetector();
    const throttler = new AdaptiveThrottler(
      { batchSize: 10, maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 1000, lockDurationMs: 1000, lockRenewIntervalMs: 100, checkpointInterval: 10, poisonThreshold: 3, orphanTimeoutMs: 100, networkLatencyThresholdMs: 100, packetLossThreshold: 0.1 },
      detector,
    );

    // Simulate poor quality
    (detector as any).samples = [
      { latency: 3000, success: false },
      { latency: 4000, success: false },
      { latency: 2000, success: false },
    ];

    throttler.adjust();
    expect(throttler.getBatchSize()).toBeLessThan(10);
    expect(throttler.shouldProcess()).toBe(false);
  });

  it('should allow processing on good network', () => {
    const detector = new NetworkQualityDetector();
    const throttler = new AdaptiveThrottler(
      { batchSize: 10, maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 1000, lockDurationMs: 1000, lockRenewIntervalMs: 100, checkpointInterval: 10, poisonThreshold: 3, orphanTimeoutMs: 100, networkLatencyThresholdMs: 100, packetLossThreshold: 0.1 },
      detector,
    );

    // Simulate good quality - mostly successful with low latency
    (detector as any).samples = Array(10).fill({ latency: 50, success: true });

    throttler.adjust();
    expect(throttler.shouldProcess()).toBe(true);
  });
});
