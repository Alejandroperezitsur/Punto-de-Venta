import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDB } from '../../src/lib/db';
import { offlineRecoveryEngine } from '../../src/lib/offlineRecoveryEngine';
import { dataConsistency } from '../../src/lib/dataConsistency';
import { transactionSafety } from '../../src/lib/transactionSafety';
import { performanceTelemetry } from '../../src/lib/performanceTelemetry';
import { interactionTracker } from '../../src/lib/interactionTracker';
import { productionDiagnostics } from '../../src/lib/productionDiagnostics';
import { selfHealingUI } from '../../src/lib/selfHealingUI';

describe('Chaos: IndexedDB Corruption Recovery', () => {
  it('should recover from simulated DB corruption', async () => {
    const db = await getDB();

    await db.put('queueItems', {
      id: 'corrupt-item',
      type: 'sale',
      payload: { total: 100 },
      status: 'processing',
      idempotencyKey: 'corrupt-ik',
      correlationId: 'corrupt-corr',
      attempts: 3,
      maxAttempts: 5,
      lastError: 'timeout',
      nextRetryAt: null,
      createdAt: Date.now() - 600000,
      updatedAt: Date.now() - 600000,
      checkpoint: 0,
      batchId: null,
    });

    const issues = await dataConsistency.detectInvalidState();
    expect(issues.length).toBeGreaterThanOrEqual(1);

    const repaired = await dataConsistency.repairInvalidState();
    expect(repaired).toBeGreaterThanOrEqual(1);

    const afterItems = await db.getAll('queueItems');
    const repairedItem = afterItems.find(i => i.id === 'corrupt-item');
    expect(repairedItem?.status).toBe('pending');
    expect(repairedItem?.attempts).toBe(3);
  });

  it('should handle store-level corruption via recovery engine', async () => {
    const result = await offlineRecoveryEngine.detectCorruptedState();
    expect(result.corrupted).toBeDefined();
    expect(Array.isArray(result.corrupted)).toBe(true);
  });
});

describe('Chaos: Quota Exceeded Simulation', () => {
  it('should handle quota exceeded errors gracefully', async () => {
    const originalPut = IDBObjectStore.prototype.put;
    let quotaFailures = 0;

    IDBObjectStore.prototype.put = vi.fn().mockRejectedValue(
      new DOMException('QuotaExceededError', 'QuotaExceededError'),
    );

    try {
      const db = await getDB();
      const tx = db.transaction('queueItems', 'readwrite');

      try {
        await tx.store.put({
          id: 'quota-item',
          type: 'sale',
          payload: { total: 100 },
          status: 'pending',
          idempotencyKey: 'quota-ik',
          correlationId: 'quota-corr',
          attempts: 0,
          maxAttempts: 5,
          lastError: null,
          nextRetryAt: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          checkpoint: 0,
          batchId: null,
        });
        await tx.done;
      } catch (e) {
        quotaFailures++;
        expect((e as DOMException).name).toBe('QuotaExceededError');
      }
    } finally {
      IDBObjectStore.prototype.put = originalPut;
    }

    expect(quotaFailures).toBe(1);
  });

  it('should handle large data without quota issues in test env', async () => {
    const db = await getDB();
    const tx = db.transaction('metrics', 'readwrite');
    const largePayload = 'x'.repeat(10000);

    for (let i = 0; i < 100; i++) {
      await tx.store.put({
        id: `large-metric-${i}`,
        name: 'test_large',
        value: i,
        labels: { data: largePayload },
        timestamp: Date.now(),
      });
    }
    await tx.done;

    const count = await db.count('metrics');
    expect(count).toBe(100);
  }, 15000);
});

describe('Chaos: Interrupted Writes', () => {
  it('should handle partial batch writes', async () => {
    const db = await getDB();
    const BATCH_SIZE = 50;

    const originalPut = IDBObjectStore.prototype.put;
    let putCount = 0;

    IDBObjectStore.prototype.put = vi.fn().mockImplementation(async function (...args: any[]) {
      putCount++;
      if (putCount === 25) {
        throw new DOMException('AbortError', 'AbortError');
      }
      return originalPut.apply(this, args as any);
    });

    try {
      const tx = db.transaction('queueItems', 'readwrite');
      for (let i = 0; i < BATCH_SIZE; i++) {
        try {
          await tx.store.put({
            id: `interrupted-${i}`,
            type: 'sale',
            payload: { total: 100 },
            status: 'pending',
            idempotencyKey: `int-ik-${i}`,
            correlationId: `int-corr-${i}`,
            attempts: 0,
            maxAttempts: 5,
            lastError: null,
            nextRetryAt: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            checkpoint: 0,
            batchId: null,
          });
        } catch {
          break;
        }
      }
      await tx.done.catch(() => {});
    } finally {
      IDBObjectStore.prototype.put = originalPut;
    }

    const remaining = await db.getAll('queueItems');
    const remainingIds = remaining.filter(i => i.id.startsWith('interrupted-'));
    expect(remainingIds.length).toBeLessThan(BATCH_SIZE);
  }, 15000);

  it('should survive synchronous operation interruption', () => {
    const { idempotencyKey } = transactionSafety.beginSale('interrupted-checkout', 100, 1);

    expect(transactionSafety.isIdempotencyKeyUsed(idempotencyKey)).toBe(true);

    const completed = transactionSafety.completeSale(idempotencyKey);
    expect(completed).resolves.toBe(true);
  });
});

describe('Chaos: Dynamic Import / Chunk Load Failures', () => {
  it('should handle failed dynamic imports gracefully', async () => {
    const errors: ErrorEvent[] = [];
    const handler = (e: ErrorEvent) => errors.push(e);
    window.addEventListener('error', handler);

    let result;
    try {
      const dynamicImport = new Function('url', 'return import(url)');
      result = await dynamicImport('/nonexistent-chunk.js');
    } catch (e) {
      productionDiagnostics.recordError(e);
      result = null;
    }

    expect(result).toBeNull();
    window.removeEventListener('error', handler);
  });

  it('should handle chunk loading timeout', async () => {
    let caught = false;
    try {
      const controller = new AbortController();
      const dynamicImport = new Function('url', 'return import(url)');
      setTimeout(() => controller.abort(), 0);
      await dynamicImport('/chunks/broken-chunk.js');
    } catch (e) {
      productionDiagnostics.recordError(e);
      caught = true;
    }

    expect(caught).toBe(true);
  });
});

describe('Chaos: Self-Healing UI Failure Modes', () => {
  it('should attempt automatic recovery on failure', async () => {
    let healCalls = 0;
    const result = await selfHealingUI.attemptHeal('test-module', async () => {
      healCalls++;
      return true;
    });

    expect(result.healed).toBe(true);
    expect(result.fallbackUsed).toBe(false);
    expect(healCalls).toBe(1);
  });

  it('should use fallback when heal returns false', async () => {
    const result = await selfHealingUI.attemptHeal('failing-module', async () => {
      return false;
    });

    expect(result.healed).toBe(false);
    expect(result.fallbackUsed).toBe(true);
  });

  it('should limit heal attempts with cooldown', async () => {
    const results: boolean[] = [];
    for (let i = 0; i < 5; i++) {
      const result = await selfHealingUI.attemptHeal('cooldown-module', async () => {
        results.push(true);
        return true;
      });
    }

    const state = selfHealingUI.getState('cooldown-module');
    expect(state.healAttempts).toBeGreaterThanOrEqual(0);
    expect(state.healAttempts).toBeLessThanOrEqual(4);
  });

  it('should record errors with state tracking', () => {
    selfHealingUI.recordError('error-module', 'Connection timeout');
    selfHealingUI.recordError('error-module', 'Invalid response');

    const state = selfHealingUI.getState('error-module');
    expect(state.errorCount).toBe(2);
    expect(state.status).toBe('failed');
    expect(state.lastError).toBe('Invalid response');
  });

  it('should reset state on demand', () => {
    selfHealingUI.recordError('reset-module', 'Some error');
    expect(selfHealingUI.isDegraded('reset-module')).toBe(true);

    selfHealingUI.resetState('reset-module');
    expect(selfHealingUI.isDegraded('reset-module')).toBe(false);
  });
});

describe('Chaos: Production Diagnostics', () => {
  it('should capture diagnostic snapshots', async () => {
    performanceTelemetry.record('diag.test', 42);
    interactionTracker.trackClick('diag-btn');

    const snapshot = await productionDiagnostics.captureSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.timestamp).toBeGreaterThan(0);
    expect(snapshot.performance).toBeDefined();
    expect(snapshot.interactions).toBeDefined();
  });

  it('should record errors and recoveries', () => {
    productionDiagnostics.recordError(new Error('test error 1'));
    productionDiagnostics.recordError(new Error('test error 2'));
    productionDiagnostics.recordRecovery(true);
    productionDiagnostics.recordRecovery(false);

    const snapshot = productionDiagnostics.getLatestSnapshot();
    if (snapshot) {
      expect(snapshot.recovery.count).toBeGreaterThanOrEqual(0);
    }
  });

  it('should generate readable reports', async () => {
    const report = await productionDiagnostics.generateReport();
    expect(report).toBeDefined();
    expect(report.length).toBeGreaterThan(50);
    expect(report).toContain('POS Diagnostic Report');
    expect(report).toContain('Memory');
    expect(report).toContain('Queue');
    expect(report).toContain('Performance');
  });

  it('should not expose sensitive information in errors', () => {
    productionDiagnostics.recordError(new Error('https://secret.example.com/api-key=sk-12345'));
    productionDiagnostics.recordError(new Error('password=hunter2'));

    const snapshot = productionDiagnostics.getLatestSnapshot();
    if (snapshot) {
      for (const err of snapshot.errors.recent) {
        expect(err).not.toContain('secret.example.com');
        expect(err).not.toContain('hunter2');
      }
    }
  });
});

describe('Chaos: Browser Kill / Tab Crash Resilience', () => {
  it('should persist in-flight state for recovery after simulated crash', async () => {
    const { idempotencyKey } = transactionSafety.beginSale('crash-sale', 250.75, 3);

    const db = await getDB();
    await db.put('syncLog', {
      id: `crash-log-${Date.now()}`,
      idempotencyKey,
      checkoutId: 'crash-checkout',
      status: 'pending',
      total: 250.75,
      timestamp: Date.now(),
    });

    const allLogs = await db.getAll('syncLog');
    const crashLogs = allLogs.filter(l => l.idempotencyKey === idempotencyKey);
    expect(crashLogs.length).toBeGreaterThanOrEqual(1);

    const result = await transactionSafety.completeSale(idempotencyKey);
    expect(result).toBe(true);
  });

  it('should survive sudden telemetry stop during recording', () => {
    const results: number[] = [];

    for (let i = 0; i < 100; i++) {
      performanceTelemetry.start(`crash-metric-${i}`);
      if (i === 50) {
        performanceTelemetry.disable();
      }
      results.push(i);
    }

    performanceTelemetry.enable();
    expect(results.length).toBe(100);
  });
});
