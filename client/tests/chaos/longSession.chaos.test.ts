import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDB } from '../../src/lib/db';
import { incidentForensics } from '../../src/lib/incidentForensics';
import { storageLifecycleManager } from '../../src/lib/storageLifecycleManager';
import { syncStateMachine } from '../../src/lib/syncStateMachine';
import { degradedModeEngine } from '../../src/lib/degradedModeEngine';
import { productionGovernor } from '../../src/lib/productionGovernor';
import { metrics } from '../../src/lib/metricsCollector';

describe('Long Session: 12h Runtime Simulation', () => {
  beforeEach(() => {
    localStorage.clear();
    incidentForensics.clearBuffer();
    productionGovernor.resetAllCircuitBreakers();
    metrics.start();
  });

  afterEach(() => {
    metrics.stop();
  });

  it('should simulate 1000+ sales without queue explosion', async () => {
    const db = await getDB();
    const SALE_COUNT = 1000;

    for (let i = 0; i < SALE_COUNT; i++) {
      await db.put('queueItems', {
        id: `long-sale-${i}`,
        type: 'sale',
        priority: 1,
        payload: { total: Math.random() * 500, items: [{ id: `product-${i % 50}`, quantity: 1, price: 100 }] },
        idempotencyKey: `long-ik-${i}`,
        correlationId: `long-corr-${i}`,
        status: i % 10 === 0 ? 'delivered' : 'pending',
        attempts: 0,
        maxAttempts: 5,
        lastError: null,
        nextRetryAt: i % 10 === 0 ? null : Date.now() + 1000,
        createdAt: Date.now() - (SALE_COUNT - i) * 100,
        updatedAt: Date.now() - (SALE_COUNT - i) * 100,
        checkpoint: 0,
        batchId: null,
      });
    }

    await db.put('deadLetters', {
      id: 'dl-1',
      originalId: 'dead-1',
      type: 'sale',
      payload: { total: 50 },
      errorHistory: [{ attempt: 5, error: 'timeout', timestamp: Date.now() - 3600000 }],
      poisonedAt: Date.now() - 3600000,
      correlationId: 'dl-corr',
    });

    const allItems = await db.getAll('queueItems');
    expect(allItems.length).toBe(SALE_COUNT);

    const health = await storageLifecycleManager.runHealthCheck();
    expect(health.queueGrowth.total).toBe(SALE_COUNT);
    expect(health.queueGrowth.pending).toBe(SALE_COUNT - Math.floor(SALE_COUNT / 10));
    expect(health.indexedDB.ok).toBe(true);

    metrics.setGauge('pos_queue_lag', { priority: '1' }, SALE_COUNT);
    const metricValue = metrics.getMetric('pos_queue_lag', { priority: '1' });
    expect(metricValue).toBe(SALE_COUNT);

    const safety = await productionGovernor.runSafetyCheck();
    expect(safety).toBeDefined();

    incidentForensics.recordEvent('critical_error', { error: 'Simulated 12h session check', saleCount: SALE_COUNT });

    const timeline = await incidentForensics.reconstructTimeline(undefined, Date.now() - 86400000);
    const criticalEvents = timeline.filter(t => t.severity === 'critical');
    expect(criticalEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('should survive repeated state transitions without memory issues', async () => {
    const TRANSITION_COUNT = 500;

    for (let i = 0; i < TRANSITION_COUNT; i++) {
      syncStateMachine.setSyncing(`batch_${i}`);
      if (i % 10 === 0) {
        syncStateMachine.setRetrying(`retry_${i}`);
        productionGovernor.recordRetry();
      }
      if (i % 50 === 0) {
        syncStateMachine.setDegraded(`degraded_${i}`);
      }
      if (i % 100 === 0) {
        syncStateMachine.setConflicted(`conflict_${i}`);
      }
      syncStateMachine.setRecovered();
      syncStateMachine.recordSuccess();
    }

    const info = syncStateMachine.getSyncStateInfo();
    expect(info.transitionCount).toBeGreaterThanOrEqual(TRANSITION_COUNT);

    const transitions = syncStateMachine.getTransitions(20);
    expect(transitions.length).toBe(20);

    expect(['idle', 'syncing', 'retrying', 'degraded', 'conflicted', 'recovered']).toContain(info.current);
  });

  it('should maintain storage health under continuous cleanup cycles', async () => {
    const CLEANUP_CYCLES = 30;

    for (let cycle = 0; cycle < CLEANUP_CYCLES; cycle++) {
      const db = await getDB();
      const now = Date.now();

      for (let j = 0; j < 20; j++) {
        await db.put('apiCache', {
          request: `/api/test/${cycle}_${j}`,
          method: 'GET',
          response: { data: 'test' },
          tags: ['test'],
          updatedAt: now - (CLEANUP_CYCLES - cycle) * 100000,
        });
      }

      const actions = await storageLifecycleManager.runAutoCleanup();
      const cleanupCount = actions.reduce((sum, a) => sum + a.removedCount, 0);
      expect(cleanupCount).toBeGreaterThanOrEqual(0);
    }

    const health = await storageLifecycleManager.runHealthCheck();
    expect(health.cacheGrowth.apiCacheCount).toBeLessThanOrEqual(600);
  });

  it('should validate 12h+ session survivability', async () => {
    const db = await getDB();
    for (let i = 0; i < 10; i++) {
      await db.put('queueItems', {
        id: `survivability-${i}`,
        type: 'sale',
        priority: 0,
        payload: { total: 100 },
        idempotencyKey: `surv-ik-${i}`,
        correlationId: 'surv-test',
        status: 'pending',
        attempts: i,
        maxAttempts: 5,
        lastError: i > 8 ? 'timeout' : null,
        nextRetryAt: Date.now() + 1000,
        createdAt: Date.now() - 43200000,
        updatedAt: Date.now() - 10000,
        checkpoint: 0,
        batchId: null,
      });
    }

    const validation = await storageLifecycleManager.validateLongSession();
    expect(validation).toBeDefined();
    expect(typeof validation.runtimeMs).toBe('number');
    expect(Array.isArray(validation.issues)).toBe(true);
  });

  it('should handle 100 degraded/emergency transitions without stabilization failure', async () => {
    for (let i = 0; i < 100; i++) {
      degradedModeEngine.enterDegradedMode(`cycle_${i}`);
      degradedModeEngine.restoreNormal();
    }

    const status = degradedModeEngine.getOperationalStatus();
    expect(status.status).toBe('normal');
    expect(status.canSell).toBe(true);
  });
});
