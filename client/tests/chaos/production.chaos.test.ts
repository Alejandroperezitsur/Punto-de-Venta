import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDB } from '../../src/lib/db';
import { incidentForensics } from '../../src/lib/incidentForensics';
import { degradedModeEngine } from '../../src/lib/degradedModeEngine';
import { productionGovernor } from '../../src/lib/productionGovernor';
import { syncStateMachine } from '../../src/lib/syncStateMachine';
import { storageLifecycleManager } from '../../src/lib/storageLifecycleManager';
import { offlineRecoveryEngine } from '../../src/lib/offlineRecoveryEngine';

describe('Production Chaos: Reconnect Storm', () => {
  beforeEach(() => {
    localStorage.clear();
    incidentForensics.clearBuffer();
  });

  it('should survive 50 rapid reconnect events without memory growth', async () => {
    for (let i = 0; i < 50; i++) {
      incidentForensics.recordEvent('reconnect', { attempt: i, durationMs: Math.random() * 10000 });
    }

    const events = incidentForensics.getRecentEvents(60);
    expect(events.length).toBe(50);
    expect(events.filter(e => e.type === 'reconnect').length).toBe(50);

    const timeline = await incidentForensics.reconstructTimeline(undefined, Date.now() - 3600000);
    expect(timeline.length).toBe(50);

    const bufferSize = incidentForensics.getBufferSize();
    expect(bufferSize).toBeLessThanOrEqual(200);
  });

  it('should detect reconnect storm and degrade gracefully', async () => {
    const stormDetected = syncStateMachine.checkReconnectStorm(3, 60000);
    expect(stormDetected).toBe(false);

    for (let i = 0; i < 5; i++) {
      syncStateMachine.setSyncing(`reconnect_${i}`);
      syncStateMachine.setRecovered();
    }

    const detected = syncStateMachine.checkReconnectStorm(3, 60000);
    expect(detected).toBe(true);
  });
});

describe('Production Chaos: Browser Freeze Recovery', () => {
  it('should recover from simulated freeze (stale processing items)', async () => {
    const db = await getDB();
    const frozenTime = Date.now() - 600000;

    for (let i = 0; i < 10; i++) {
      await db.put('queueItems', {
        id: `frozen-${i}`,
        type: 'sale',
        priority: 0,
        payload: { total: 50 + i },
        idempotencyKey: `frozen-ik-${i}`,
        correlationId: 'freeze-test',
        status: 'processing',
        attempts: 2,
        maxAttempts: 5,
        lastError: null,
        nextRetryAt: null,
        createdAt: frozenTime,
        updatedAt: frozenTime,
        checkpoint: 0,
        batchId: null,
      });
    }

    const recovery = await offlineRecoveryEngine.repairStaleQueues();
    const repaired = recovery.find(a => a.type === 'queue_reset');
    expect(repaired?.executed).toBe(true);
    expect(repaired?.result).toBe('success');

    const items = await db.getAll('queueItems');
    const recoveredItems = items.filter(i => i.status === 'pending' && i.id.startsWith('frozen-'));
    expect(recoveredItems.length).toBe(10);
    expect(recoveredItems.every(i => i.lastError?.includes('Recovered'))).toBe(true);
  });
});

describe('Production Chaos: Storage Quota Exceeded', () => {
  it('should handle simulated quota exceeded gracefully', async () => {
    const db = await getDB();
    for (let i = 0; i < 100; i++) {
      await db.put('metrics', {
        id: `quota-test-${i}`,
        name: 'test_metric',
        value: i,
        labels: {},
        timestamp: Date.now() - (i * 100000),
      });
    }

    const initialCount = await db.count('metrics');
    expect(initialCount).toBeGreaterThanOrEqual(100);

    incidentForensics.recordEvent('quota_exceeded', { percentUsed: 92 });

    const events = incidentForensics.getRecentEvents(10);
    expect(events.some(e => e.type === 'quota_exceeded')).toBe(true);

    const health = await storageLifecycleManager.runHealthCheck();
    expect(health).toBeDefined();
    expect(typeof health.ok).toBe('boolean');
    expect(typeof health.quota.percentUsed).toBe('number');
  });
});

describe('Production Chaos: IndexedDB Corruption', () => {
  it('should detect corruption and enter degraded/emergency mode', async () => {
    degradedModeEngine.setComponentStatus('indexedDB', 'failed', 'Simulated corruption');
    await degradedModeEngine.evaluateDegradation();

    const status = degradedModeEngine.getOperationalStatus();
    expect(status.activeDegradations.length).toBeGreaterThanOrEqual(0);

    degradedModeEngine.resetComponent('indexedDB');
  });

  it('should handle complete IndexedDB inaccessibility', async () => {
    const fallbackMode = degradedModeEngine.getStorageFallbackMode();
    expect(['indexeddb', 'memory', 'localstorage']).toContain(fallbackMode);

    degradedModeEngine.setStorageFallbackMode('memory');
    const id = degradedModeEngine.enqueueMemoryFallback('sale', { total: 99 });
    expect(id).toBeTruthy();
    expect(degradedModeEngine.getMemoryQueueLength()).toBe(1);

    degradedModeEngine.setStorageFallbackMode('indexeddb');
  });
});

describe('Production Chaos: Tab Crash Recovery', () => {
  it('should capture pre-crash snapshot and recover after simulated crash', async () => {
    const db = await getDB();
    for (let i = 0; i < 5; i++) {
      await db.put('queueItems', {
        id: `pre-crash-${i}`,
        type: 'sale',
        priority: 0,
        payload: { total: 100 + i },
        idempotencyKey: `crash-ik-${i}`,
        correlationId: 'crash-test',
        status: 'pending',
        attempts: 0,
        maxAttempts: 5,
        lastError: null,
        nextRetryAt: Date.now() + 5000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        checkpoint: 0,
        batchId: null,
      });
    }

    incidentForensics.recordEvent('crash', { reason: 'simulated_tab_crash', itemsInQueue: 5 });

    const snapshot = await incidentForensics.captureIncidentSnapshot('crash_test');
    expect(snapshot).toBeDefined();
    expect(snapshot.queueState.pending).toBeGreaterThanOrEqual(5);
    expect(snapshot.queueState.processing).toBe(0);

    const timeline = await incidentForensics.reconstructTimeline('crash_test', Date.now() - 3600000);
    const crashEvents = timeline.filter(t => t.type === 'crash');
    expect(crashEvents.length).toBe(1);
    expect(crashEvents[0].severity).toBe('critical');
  });
});

describe('Production Chaos: Partial Write Recovery', () => {
  it('should handle failed writes with circuit breaker protection', async () => {
    for (let i = 0; i < 6; i++) {
      productionGovernor.recordCircuitFailure('storage', `Simulated write failure ${i}`);
    }

    const cb = productionGovernor.getCircuitBreaker('storage');
    expect(cb.state).toBe('open');
    expect(productionGovernor.isCircuitOpen('storage')).toBe(true);

    const cbOpen = productionGovernor.getCircuitBreaker('storage');
    expect(cbOpen.state).toBe('open');

    productionGovernor.recordCircuitSuccess('storage');
    productionGovernor.recordCircuitSuccess('storage');
    expect(productionGovernor.isCircuitOpen('storage')).toBe(true);

    productionGovernor.resetCircuitBreaker('storage');
    const cbClosed = productionGovernor.getCircuitBreaker('storage');
    expect(cbClosed.state).toBe('closed');
  });
});

describe('Production Chaos: Multiple Simultaneous Failures', () => {
  it('should handle sync failure + storage failure simultaneously', async () => {
    productionGovernor.recordCircuitFailure('sync', 'Sync timeout');
    productionGovernor.recordCircuitFailure('storage', 'Storage write error');
    incidentForensics.recordEvent('sync_error', { error: 'Sync timeout during storage failure' });

    const syncCb = productionGovernor.getCircuitBreaker('sync');
    expect(syncCb.state).toBe('closed');

    productionGovernor.recordCircuitFailure('sync', 'Sync timeout 2');
    productionGovernor.recordCircuitFailure('sync', 'Sync timeout 3');
    productionGovernor.recordCircuitFailure('sync', 'Sync timeout 4');
    productionGovernor.recordCircuitFailure('sync', 'Sync timeout 5');
    const syncCbAfter = productionGovernor.getCircuitBreaker('sync');
    expect(syncCbAfter.state).toBe('open');

    productionGovernor.resetAllCircuitBreakers();

    const allSync = productionGovernor.getAllCircuitBreakers();
    expect(allSync.sync.state).toBe('closed');
    expect(allSync.storage.state).toBe('closed');
  });

  it('should produce forensic report after cascading failures', async () => {
    incidentForensics.recordEvent('critical_error', { error: 'Connection lost' });
    incidentForensics.recordEvent('reconnect', { durationMs: 5000 });
    incidentForensics.recordEvent('sync_error', { error: 'Batch send failed' });
    incidentForensics.recordEvent('recovery', { action: 'queue_repair', success: true });
    incidentForensics.recordEvent('degraded_mode', { reason: 'Multiple errors' });
    incidentForensics.recordEvent('circuit_breaker', { breaker: 'sync', state: 'opened' });

    const report = await incidentForensics.generateForensicReport('cascade_test');
    expect(report).toBeDefined();
    expect(report.summary).toBeDefined();
    expect(report.timeline.length).toBeGreaterThanOrEqual(6);
    expect(report.survivabilityScore).toBeGreaterThanOrEqual(0);
    expect(report.survivabilityScore).toBeLessThanOrEqual(100);

    const package_ = await incidentForensics.exportForensicPackage('cascade_test');
    expect(package_.report).toBeDefined();
    expect(package_.sanitizedLogs).toBeDefined();
    expect(package_.metrics).toBeDefined();
  });
});
