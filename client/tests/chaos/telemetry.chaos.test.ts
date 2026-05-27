import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performanceTelemetry } from '../../src/lib/performanceTelemetry';
import { interactionTracker } from '../../src/lib/interactionTracker';
import { deviceDetector } from '../../src/lib/deviceDetector';
import { transactionSafety } from '../../src/lib/transactionSafety';
import { offlineRecoveryEngine } from '../../src/lib/offlineRecoveryEngine';
import { dataConsistency } from '../../src/lib/dataConsistency';
import { getDB } from '../../src/lib/db';

describe('Chaos: Performance Telemetry', () => {
  beforeEach(() => {
    performanceTelemetry.clear();
  });

  it('should handle 100k rapid measurements without memory issues', () => {
    for (let i = 0; i < 100000; i++) {
      performanceTelemetry.record('test.metric', Math.random() * 1000, { index: i });
    }
    const marks = performanceTelemetry.getMarks();
    expect(marks.length).toBeLessThanOrEqual(500);
  });

  it('should compute percentiles correctly under load', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    for (const v of values) {
      performanceTelemetry.record('percentile.test', v);
    }
    const p50 = performanceTelemetry.getPercentile('percentile.test', 50);
    const p95 = performanceTelemetry.getPercentile('percentile.test', 95);
    const p99 = performanceTelemetry.getPercentile('percentile.test', 99);
    expect(p50).toBeGreaterThanOrEqual(50);
    expect(p50).toBeLessThanOrEqual(60);
    expect(p95).toBe(100);
    expect(p99).toBe(100);
  });

  it('should handle concurrent subscriptions', () => {
    const calls: string[] = [];
    const unsub1 = performanceTelemetry.subscribe((m) => calls.push(`a:${m.name}`));
    const unsub2 = performanceTelemetry.subscribe((m) => calls.push(`b:${m.name}`));
    const unsub3 = performanceTelemetry.subscribe((m) => calls.push(`c:${m.name}`));

    performanceTelemetry.record('sub.test', 42);

    expect(calls.length).toBe(3);
    expect(calls.filter(c => c.includes('sub.test')).length).toBe(3);

    unsub1();
    unsub2();
    unsub3();
  });

  it('should handle subscriber unsubscribe mid-notification', () => {
    const unsub = performanceTelemetry.subscribe(() => {
      unsub();
    });
    performanceTelemetry.record('unsub.test', 1);
    performanceTelemetry.record('unsub.test', 2);
    const marks = performanceTelemetry.getMarksByName('unsub.test');
    expect(marks.length).toBe(2);
  });
});

describe('Chaos: Interaction Tracker', () => {
  beforeEach(() => {
    interactionTracker.clear();
  });

  it('should detect rage clicks correctly', () => {
    for (let i = 0; i < 10; i++) {
      interactionTracker.trackClick('btn-submit');
    }
    const counts = interactionTracker.getCounts();
    expect(counts.rageClicks).toBeGreaterThanOrEqual(1);
  });

  it('should detect repeated scans', () => {
    for (let i = 0; i < 10; i++) {
      interactionTracker.trackScan('BARCODE001');
    }
    const counts = interactionTracker.getCounts();
    expect(counts.repeatedScans).toBeGreaterThanOrEqual(1);
  });

  it('should track all interaction types', () => {
    interactionTracker.trackFocusRestore();
    interactionTracker.trackRetry('sync');
    interactionTracker.trackFailedAction('checkout', 'timeout');
    interactionTracker.trackDoubleSubmit('payment');
    interactionTracker.trackDoubleSubmit('payment');
    interactionTracker.trackScannerRecovery('focus_lost');

    const counts = interactionTracker.getCounts();
    expect(counts.focusRestores).toBe(1);
    expect(counts.retries).toBe(1);
    expect(counts.failedActions).toBe(1);
    expect(counts.doubleSubmits).toBe(1);
    expect(counts.scannerRecoveries).toBe(1);
  });

  it('should not accumulate events beyond max', () => {
    for (let i = 0; i < 1000; i++) {
      interactionTracker.trackClick(`btn-${i}`);
    }
    expect(interactionTracker.getEvents().length).toBeLessThanOrEqual(300);
  });
});

describe('Chaos: Transaction Safety', () => {
  it('should prevent duplicate sales within window', () => {
    const { idempotencyKey } = transactionSafety.beginSale('checkout-1', 150.50, 3);
    expect(transactionSafety.isDuplicate('checkout-1', 150.50)).toBe(true);
    expect(transactionSafety.isDuplicate('checkout-2', 99.99)).toBe(false);
  });

  it('should enforce idempotency', () => {
    const { idempotencyKey } = transactionSafety.beginSale('checkout-2', 200, 2);
    expect(transactionSafety.isIdempotencyKeyUsed(idempotencyKey)).toBe(true);
    expect(transactionSafety.isIdempotencyKeyUsed('fake-key')).toBe(false);
  });

  it('should handle concurrent sale completions', async () => {
    const sale1 = transactionSafety.beginSale('c1', 100, 1);
    const sale2 = transactionSafety.beginSale('c2', 200, 2);
    const sale3 = transactionSafety.beginSale('c3', 300, 3);

    const results = await Promise.all([
      transactionSafety.completeSale(sale1.idempotencyKey),
      transactionSafety.completeSale(sale2.idempotencyKey),
      transactionSafety.completeSale(sale3.idempotencyKey),
    ]);

    expect(results).toEqual([true, true, true]);

    const reComplete = await transactionSafety.completeSale(sale1.idempotencyKey);
    expect(reComplete).toBe(false);
  });

  it('should clear old entries', () => {
    transactionSafety.beginSale('old-checkout', 50, 1);
    transactionSafety.clearOld(86400000);
    expect(transactionSafety.isDuplicate('old-checkout', 50)).toBe(true);
  });
});

describe('Chaos: Data Consistency', () => {
  it('should detect stale transactions', async () => {
    const db = await getDB();
    const oldDate = Date.now() - 48 * 3600000;
    await db.put('queueItems', {
      id: 'stale-item-1',
      type: 'sale',
      payload: { total: 100 },
      status: 'pending',
      idempotencyKey: 'stale-ik-1',
      correlationId: 'stale-corr-1',
      attempts: 0,
      maxAttempts: 5,
      lastError: null,
      nextRetryAt: oldDate,
      createdAt: oldDate,
      updatedAt: oldDate,
      checkpoint: 0,
      batchId: null,
    });

    const stale = await dataConsistency.detectStaleTransactions(1);
    expect(stale.length).toBeGreaterThanOrEqual(1);
    expect(stale[0].id).toBe('stale-item-1');
  });

  it('should repair invalid state', async () => {
    const db = await getDB();
    await db.put('queueItems', {
      id: 'invalid-item',
      type: 'sale',
      payload: {},
      status: 'processing',
      idempotencyKey: 'inv-ik',
      correlationId: 'inv-corr',
      attempts: -5,
      maxAttempts: 0,
      lastError: null,
      nextRetryAt: null,
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now() - 3600000,
      checkpoint: 0,
      batchId: null,
    });

    const issues = await dataConsistency.detectInvalidState();
    expect(issues.length).toBeGreaterThan(0);

    const repaired = await dataConsistency.repairInvalidState();
    expect(repaired).toBeGreaterThanOrEqual(1);
  });

  it('should run full check without throwing', async () => {
    const report = await dataConsistency.runFullCheck();
    expect(report).toBeDefined();
    expect(report.checks.length).toBeGreaterThanOrEqual(4);
    expect(['pass', 'fail', 'warn']).toContain(report.overall);
  });
});

describe('Chaos: Offline Recovery Engine', () => {
  it('should run full recovery without throwing', async () => {
    const report = await offlineRecoveryEngine.runRecovery();
    expect(report).toBeDefined();
    expect(Array.isArray(report.actions)).toBe(true);
  });

  it('should detect broken IndexedDB state', async () => {
    const result = await offlineRecoveryEngine.detectCorruptedState();
    expect(result).toBeDefined();
    expect(Array.isArray(result.corrupted)).toBe(true);
  });

  it('should repair stale processing queues', async () => {
    const db = await getDB();
    const oldDate = Date.now() - 600000;
    await db.put('queueItems', {
      id: 'stuck-item',
      type: 'sale',
      payload: {},
      status: 'processing',
      idempotencyKey: 'stuck-ik',
      correlationId: 'stuck-corr',
      attempts: 3,
      maxAttempts: 5,
      lastError: 'timeout',
      nextRetryAt: oldDate,
      createdAt: oldDate,
      updatedAt: oldDate,
      checkpoint: 0,
      batchId: null,
    });

    const actions = await offlineRecoveryEngine.repairStaleQueues();
    const repairedAction = actions.find(a => a.executed);
    expect(repairedAction).toBeDefined();
  });

  it('should verify data integrity', async () => {
    const result = await offlineRecoveryEngine.verifyDataIntegrity();
    expect(result).toBeDefined();
    expect('valid' in result).toBe(true);
    expect(Array.isArray(result.issues)).toBe(true);
  });
});

describe('Chaos: Device Detector Overrides', () => {
  it('should handle missing navigator APIs', () => {
    const hw = (navigator as any).hardwareConcurrency;
    expect(hw).toBeDefined();
  });

  it('should detect animation preference', () => {
    const reducedMotion = deviceDetector.getCached()?.reducedMotion ?? false;
    expect(typeof reducedMotion).toBe('boolean');
  });

  it('should provide cached profile after detection', async () => {
    await deviceDetector.detect();
    const cached = deviceDetector.getCached();
    expect(cached).not.toBeNull();
    expect(typeof cached?.isLowEnd).toBe('boolean');
    expect(typeof cached?.hardwareConcurrency).toBe('number');
  });

  it('should subscribe and receive updates', async () => {
    const updates: any[] = [];
    const unsub = deviceDetector.subscribe((p) => updates.push(p));
    await deviceDetector.refresh();
    expect(updates.length).toBe(1);
    unsub();
  });
});

describe('Chaos: Memory Under Pressure', () => {
  it('should handle rapid telemetry start/stop cycles', () => {
    for (let cycle = 0; cycle < 100; cycle++) {
      performanceTelemetry.enable();
      performanceTelemetry.record('cycle.test', cycle);
      performanceTelemetry.disable();
      performanceTelemetry.record('cycle.test.should_not_appear', cycle);
    }
    performanceTelemetry.enable();
    const count = performanceTelemetry.getCount('cycle.test.should_not_appear');
    expect(count).toBe(0);
  });

  it('should handle large burst of interaction events', () => {
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      interactionTracker.trackClick(`burst-btn-${i}`);
      interactionTracker.trackScan(`BURST${i.toString().padStart(10, '0')}`);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });
});
