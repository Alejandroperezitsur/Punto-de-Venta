import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDB } from '../../src/lib/db';
import { incidentForensics } from '../../src/lib/incidentForensics';
import { degradedModeEngine } from '../../src/lib/degradedModeEngine';
import { productionGovernor } from '../../src/lib/productionGovernor';
import { syncStateMachine } from '../../src/lib/syncStateMachine';
import { storageLifecycleManager } from '../../src/lib/storageLifecycleManager';
import { offlineRecoveryEngine } from '../../src/lib/offlineRecoveryEngine';

describe('Cascading Failure: Sync Fails + Storage Fails', () => {
  beforeEach(() => {
    localStorage.clear();
    incidentForensics.clearBuffer();
    productionGovernor.resetAllCircuitBreakers();
    degradedModeEngine.restoreNormal();
    syncStateMachine.reset();
  });

  it('should contain failure when sync fails during storage failure', async () => {
    incidentForensics.recordEvent('critical_error', { error: 'Storage write error', component: 'indexedDB' });
    degradedModeEngine.reportComponentFailure('indexedDB', 'Storage write error');

    incidentForensics.recordEvent('sync_error', { error: 'Sync failed: storage unavailable' });
    degradedModeEngine.reportComponentFailure('syncEngine', 'Sync failed: storage unavailable');

    await degradedModeEngine.evaluateDegradation();
    degradedModeEngine.enterEmergencyMode('Simultaneous sync + storage failure');

    const status = degradedModeEngine.getOperationalStatus();
    expect(status.status).toBe('emergency');

    const fallbackId = degradedModeEngine.enqueueMemoryFallback('sale', { total: 100 });
    expect(fallbackId).toBeTruthy();

    await degradedModeEngine.flushMemoryQueue();

    const report = await incidentForensics.generateForensicReport('cascade_sync_storage');
    expect(report.timeline.length).toBeGreaterThanOrEqual(2);
    expect(report.survivabilityScore).toBeGreaterThanOrEqual(0);

    degradedModeEngine.restoreNormal();
  });

  it('should prevent infinite recovery loop during cascading failures', async () => {
    for (let i = 0; i < 10; i++) {
      productionGovernor.recordRecovery(false);
    }

    const governorState = productionGovernor.getGovernorState();
    expect(governorState.consecutiveRecoveries).toBeGreaterThanOrEqual(5);
    expect(governorState.governorLocked).toBe(true);

    const canRecover = productionGovernor.canRunRecovery();
    expect(canRecover).toBe(false);

    const canRetry = productionGovernor.canRetry();
    expect(canRetry).toBe(false);

    productionGovernor.unlockGovernor();
  });

  it('should handle recovery failure during reconnect storm', async () => {
    for (let i = 0; i < 8; i++) {
      syncStateMachine.setSyncing(`sync_${i}`);
      syncStateMachine.setRetrying(`retry_${i}`);
      productionGovernor.recordRetry();
      incidentForensics.recordEvent('reconnect', { attempt: i });
    }

    productionGovernor.recordRecovery(false);
    productionGovernor.recordRecovery(false);
    productionGovernor.recordRecovery(false);
    productionGovernor.recordRecovery(false);
    productionGovernor.recordRecovery(false);

    const governor = productionGovernor.getGovernorState();
    expect(governor.consecutiveRecoveries).toBeGreaterThanOrEqual(5);

    const escalationLevel = productionGovernor.getEscalationLevel();
    expect(escalationLevel).toBeGreaterThanOrEqual(1);

    const status = degradedModeEngine.getOperationalStatus();
    expect(status.canSell).toBe(true);

    productionGovernor.unlockGovernor();
    degradedModeEngine.restoreNormal();
  });

  it('should prevent corruption propagation during auto-repair failure', async () => {
    const conflict1 = syncStateMachine.detectConflict('transaction', 'sale-123', 'Duplicate sale detected');
    const c1 = syncStateMachine.getConflictHistory().find(c => c.id === conflict1.id)!;
    expect(c1.contained).toBe(true);

    const conflict2 = syncStateMachine.detectConflict('version', 'product-456', 'Version mismatch');

    const conflict3 = syncStateMachine.detectConflict('inventory', 'product-789', 'Stock divergence');

    const activeConflicts = syncStateMachine.getActiveConflicts();
    expect(activeConflicts.length).toBe(0);

    syncStateMachine.resolveConflict(conflict1.id, 'client_wins');
    syncStateMachine.resolveConflict(conflict2.id, 'server_wins');
    syncStateMachine.resolveConflict(conflict3.id, 'merge');

    const history = syncStateMachine.getConflictHistory();
    expect(history.every(h => h.resolved)).toBe(true);
  });

  it('should handle corruption detected during auto-repair', async () => {
    incidentForensics.recordEvent('corruption_detected', { type: 'checksum_mismatch', store: 'queueItems' });
    incidentForensics.recordEvent('recovery', { action: 'snapshot_restore', success: true });
    incidentForensics.recordEvent('critical_error', { error: 'Auto-repair found inconsistent state' });
    incidentForensics.recordEvent('recovery', { action: 'inconsistent_state_reset', success: true });

    const timeline = await incidentForensics.reconstructTimeline(undefined, Date.now() - 3600000);
    const corruptionEvents = timeline.filter(t => t.type === 'corruption_detected' || t.type === 'critical_error');
    expect(corruptionEvents.length).toBeGreaterThanOrEqual(2);

    const recoveries = timeline.filter(t => t.type === 'recovery' && t.recovered);
    expect(recoveries.length).toBeGreaterThanOrEqual(2);

    const report = await incidentForensics.generateForensicReport('auto_repair_failure');
    expect(report.survivabilityScore).toBeGreaterThanOrEqual(0);
  });

  it('should validate zero lost sales during cascading failure', async () => {
    const db = await getDB();
    for (let i = 0; i < 20; i++) {
      await db.put('queueItems', {
        id: `cascade-sale-${i}`,
        type: 'sale',
        priority: 1,
        payload: { total: 50 + i },
        idempotencyKey: `cascade-ik-${i}`,
        correlationId: 'cascade-test',
        status: 'pending',
        attempts: 0,
        maxAttempts: 5,
        lastError: null,
        nextRetryAt: Date.now() + 1000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        checkpoint: 0,
        batchId: null,
      });
    }

    incidentForensics.recordEvent('storage_failure', { error: 'IndexedDB write failed' });
    degradedModeEngine.reportComponentFailure('indexedDB', 'Write failed');

    const memoryFallbackIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const id = degradedModeEngine.enqueueMemoryFallback('sale', {
        total: 100 + i,
        idempotencyKey: `mem-${i}`,
      });
      memoryFallbackIds.push(id);
    }
    expect(memoryFallbackIds.length).toBe(5);

    const allSales = await db.getAll('queueItems');
    const pendingSales = allSales.filter(i => i.id.startsWith('cascade-sale-'));
    expect(pendingSales.length).toBe(20);

    const queueBefore = await db.count('queueItems');
    incidentForensics.recordEvent('recovery', { action: 'db_reconnect', success: true });
    await degradedModeEngine.flushMemoryQueue();

    const queueAfter = await db.count('queueItems');
    expect(queueAfter).toBe(queueBefore + 5);

    const salesBeforeRecovery = pendingSales.length;
    const memQueueSales = memoryFallbackIds.length;
    const totalSalesPreserved = salesBeforeRecovery + memQueueSales;
    expect(totalSalesPreserved).toBe(25);

    const report = await incidentForensics.generateForensicReport('cascade_zero_loss');
    expect(report.summary).toBeDefined();

    degradedModeEngine.restoreNormal();
  });
});

describe('Cascading Failure: Corruption During Recovery', () => {
  it('should handle IndexedDB corruption detected during queue recovery', async () => {
    incidentForensics.recordEvent('corruption_detected', { store: 'queueItems', error: 'Invalid state' });

    const recoveryResult = await offlineRecoveryEngine.runRecovery();
    expect(recoveryResult).toBeDefined();
    expect(Array.isArray(recoveryResult.actions)).toBe(true);

    incidentForensics.recordEvent('recovery', { action: 'full_recovery', success: recoveryResult.recovered });

    const report = await incidentForensics.generateForensicReport('corruption_during_recovery');
    expect(report.timeline.filter(t => t.type === 'corruption_detected').length).toBe(1);
    expect(report.timeline.filter(t => t.type === 'recovery').length).toBeGreaterThanOrEqual(1);
  });

  it('should handle duplicate detection during sync after partial recovery', async () => {
    const isDuplicate1 = syncStateMachine.checkDuplicate('sale', 'sale-999');
    expect(isDuplicate1).toBe(false);

    const isDuplicate2 = syncStateMachine.checkDuplicate('sale', 'sale-999');
    expect(isDuplicate2).toBe(true);

    const isDuplicate3 = syncStateMachine.checkDuplicate('movement', 'mov-111');
    expect(isDuplicate3).toBe(false);

    const duplicateCount = syncStateMachine.getTotalDuplicates();
    expect(duplicateCount).toBeGreaterThanOrEqual(1);
  });

  it('should maintain circuit breaker state through cascading failures', async () => {
    productionGovernor.recordCircuitFailure('recovery', 'Recovery failed during corruption');
    productionGovernor.recordCircuitFailure('recovery', 'Recovery failed again');
    productionGovernor.recordCircuitFailure('recovery', 'Recovery failed x3');

    const cb = productionGovernor.getCircuitBreaker('recovery');
    expect(cb.failureCount).toBe(3);
    expect(cb.state).toBe('open');

    productionGovernor.recordCircuitFailure('sync', 'Sync failure during recovery');
    productionGovernor.recordCircuitFailure('sync', 'Sync failure during recovery x2');
    productionGovernor.recordCircuitFailure('sync', 'Sync failure during recovery x3');
    productionGovernor.recordCircuitFailure('sync', 'Sync failure during recovery x4');
    productionGovernor.recordCircuitFailure('sync', 'Sync failure during recovery x5');

    const syncCb = productionGovernor.getCircuitBreaker('sync');
    expect(syncCb.state).toBe('open');

    productionGovernor.resetAllCircuitBreakers();
  });

  it('should validate degraded mode transitions are safe during cascading failure', async () => {
    degradedModeEngine.enterDegradedMode('Sync degraded');
    degradedModeEngine.disableNonCriticalComponents();
    syncStateMachine.setDegraded('Sync circuit breaker open');

    productionGovernor.recordCircuitFailure('storage', 'Storage circuit open');
    degradedModeEngine.reportComponentFailure('indexedDB', 'Storage circuit breaker open');
    degradedModeEngine.enterEmergencyMode('Cascading: sync + storage failure');

    const syncDeferred = syncStateMachine.checkDuplicate('sync', 'emergency-sync');
    syncStateMachine.checkDuplicate('sync', 'emergency-sync');

    const status = degradedModeEngine.getOperationalStatus();
    expect(status.canSell).toBe(true);
    expect(status.status).toBe('emergency');

    incidentForensics.recordEvent('recovery', { action: 'full_recovery', success: true });
    degradedModeEngine.restoreNormal();
    syncStateMachine.setRecovered('Full system recovery');
    productionGovernor.resetAllCircuitBreakers();

    const finalStatus = degradedModeEngine.getOperationalStatus();
    expect(finalStatus.status).toBe('normal');
  });

  it('should produce valid forensic export after cascading failure', async () => {
    incidentForensics.recordEvent('critical_error', { error: 'Initial failure' });
    incidentForensics.recordEvent('sync_error', { error: 'Sync failed' });
    incidentForensics.recordEvent('storage_failure', { error: 'Storage write failed' });
    incidentForensics.recordEvent('corruption_detected', { type: 'data_integrity' });
    incidentForensics.recordEvent('circuit_breaker', { breaker: 'sync', state: 'opened' });
    incidentForensics.recordEvent('emergency_mode', { reason: 'Cascading failure' });
    incidentForensics.recordEvent('recovery', { action: 'state_restore', success: true });

    const pkg = await incidentForensics.exportForensicPackage('cascading_export');
    expect(pkg.report).toBeDefined();
    expect(pkg.report.timeline.length).toBeGreaterThanOrEqual(7);
    expect(pkg.sanitizedLogs).toBeDefined();
    expect(pkg.metrics).toBeDefined();
    expect(pkg.report.survivabilityScore).toBeGreaterThanOrEqual(0);

    const criticalErrors = pkg.report.errors;
    expect(criticalErrors.length).toBeGreaterThanOrEqual(1);
  });
});
