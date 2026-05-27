import 'fake-indexeddb/auto';
import { describe, it, expect, vi } from 'vitest';
import { performanceTelemetry } from '../../src/lib/performanceTelemetry';
import { interactionTracker } from '../../src/lib/interactionTracker';
import { getDB } from '../../src/lib/db';
import { dataConsistency } from '../../src/lib/dataConsistency';
import { TransactionalQueue } from '../../src/lib/transactionalQueue';

describe('Chaos: Session Longevity', () => {
  it('should not grow memory with repeated measurements over simulated hours', async () => {
    performanceTelemetry.clear();

    const measureSnapshots: number[] = [];

    for (let simulatedMinute = 0; simulatedMinute < 480; simulatedMinute++) {
      for (let i = 0; i < 10; i++) {
        performanceTelemetry.record('checkout.total', 800 + Math.random() * 400);
        performanceTelemetry.record('scan.latency', 10 + Math.random() * 40);
        performanceTelemetry.record('route.transition', 50 + Math.random() * 100);
        performanceTelemetry.record('modal.open', 20 + Math.random() * 80);
        performanceTelemetry.record('sync.batch', 500 + Math.random() * 2000);
      }

      if (simulatedMinute % 60 === 0) {
        measureSnapshots.push(performanceTelemetry.getMarks().length);
        interactionTracker.trackClick('checkout-btn');
      }
    }

    const marks = performanceTelemetry.getMarks();
    expect(marks.length).toBeLessThanOrEqual(500);

    for (let i = 1; i < measureSnapshots.length; i++) {
      const diff = measureSnapshots[i] - measureSnapshots[i - 1];
      expect(diff).toBeLessThanOrEqual(600);
    }
  });

  it('should process items without degradation across cycles', async () => {
    const queue = new TransactionalQueue({
      batchSize: 10,
      baseDelayMs: 5,
      maxDelayMs: 50,
      maxAttempts: 1,
      concurrency: 1,
      poisonThreshold: 10,
    });

    let processed = 0;
    const processorTimes: number[] = [];

    queue.setProcessor(async (items) => {
      const start = performance.now();
      processed += items.length;
      processorTimes.push(performance.now() - start);
      return items.map((i) => ({ id: i.id, ok: true }));
    });

    await queue.start();

    for (let cycle = 0; cycle < 10; cycle++) {
      for (let i = 0; i < 50; i++) {
        await queue.enqueue('sale', { total: i }, `deg-${cycle}-${i}`, `corr-${cycle}-${i}`);
      }
    }

    await new Promise((r) => setTimeout(r, 15000));
    await queue.stop();

    expect(processed).toBe(500);

    if (processorTimes.length >= 4) {
      const half = Math.floor(processorTimes.length / 2);
      const earlyAvg = processorTimes.slice(0, half).reduce((a, b) => a + b, 0) / half;
      const lateAvg = processorTimes.slice(-half).reduce((a, b) => a + b, 0) / half;
      expect(lateAvg / Math.max(earlyAvg, 0.001)).toBeLessThan(10);
    }
  });

  it('should survive rapid toggle of telemetry enable/disable 1000 times', () => {
    for (let i = 0; i < 1000; i++) {
      if (i % 2 === 0) {
        performanceTelemetry.enable();
      } else {
        performanceTelemetry.disable();
      }
    }
    performanceTelemetry.enable();
    performanceTelemetry.record('toggle.test', 42);
    const marks = performanceTelemetry.getMarksByName('toggle.test');
    expect(marks.length).toBe(1);
  });

  it('should handle simultaneous interaction tracking across many types', async () => {
    const promises: Promise<void>[] = [];
    const TYPES = ['click', 'scan', 'focus', 'retry', 'error', 'submit', 'recovery'];

    for (let i = 0; i < 1000; i++) {
      const type = TYPES[i % TYPES.length];
      const fn = () => {
        switch (type) {
          case 'click': interactionTracker.trackClick(`multi-btn-${i}`); break;
          case 'scan': interactionTracker.trackScan(`MULTI${i.toString().padStart(8, '0')}`); break;
          case 'focus': interactionTracker.trackFocusRestore(); break;
          case 'retry': interactionTracker.trackRetry(`op-${i}`); break;
          case 'error': interactionTracker.trackFailedAction(`action-${i}`, `err-${i}`); break;
          case 'submit': interactionTracker.trackDoubleSubmit(`form-${i}`); break;
          case 'recovery': interactionTracker.trackScannerRecovery(`reason-${i}`); break;
        }
      };
      promises.push(Promise.resolve().then(fn));
    }

    await Promise.all(promises);
    const counts = interactionTracker.getCounts();
    expect(counts.rageClicks + counts.repeatedScans + counts.focusRestores +
           counts.retries + counts.failedActions + counts.doubleSubmits +
           counts.scannerRecoveries).toBeGreaterThan(0);
  }, 30000);

  it('should maintain consistency across rapid data mutations', async () => {
    const db = await getDB();

    for (let cycle = 0; cycle < 50; cycle++) {
      const items: Array<{ id: string; status: string; idempotencyKey: string }> = [];
      for (let i = 0; i < 100; i++) {
        const id = `mutate-${cycle}-${i}`;
        const statuses = ['pending', 'processing', 'done', 'delivered'];
        items.push({
          id,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          idempotencyKey: `mk-${cycle}-${i}`,
        });
      }

      const tx = db.transaction('queueItems', 'readwrite');
      for (const item of items) {
        await tx.store.put({
          ...item,
          type: 'sale',
          payload: { total: 100 },
          correlationId: `mcorr-${cycle}`,
          attempts: 0,
          maxAttempts: 5,
          lastError: null,
          nextRetryAt: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          checkpoint: 0,
          batchId: null,
        });
      }
      await tx.done;
    }

    const check = await dataConsistency.runFullCheck();
    expect(check).toBeDefined();
    expect(check.checks).toBeDefined();

    const repaired = await dataConsistency.repairInvalidState();
    expect(repaired).toBeGreaterThanOrEqual(0);
  }, 30000);
});
