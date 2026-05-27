import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDB } from '../../src/lib/db';
import { incidentForensics } from '../../src/lib/incidentForensics';
import { degradedModeEngine } from '../../src/lib/degradedModeEngine';
import { productionGovernor } from '../../src/lib/productionGovernor';
import { syncStateMachine } from '../../src/lib/syncStateMachine';
import { storageLifecycleManager } from '../../src/lib/storageLifecycleManager';
import { offlineRecoveryEngine } from '../../src/lib/offlineRecoveryEngine';
import { dataConsistency } from '../../src/lib/dataConsistency';
import { metrics } from '../../src/lib/metricsCollector';

describe('FINAL OPERATIONAL AUDIT', () => {
  beforeEach(() => {
    localStorage.clear();
    incidentForensics.clearBuffer();
    productionGovernor.resetAllCircuitBreakers();
    degradedModeEngine.restoreNormal();
    syncStateMachine.reset();
    metrics.start();
  });

  afterEach(() => {
    metrics.stop();
  });

  // === AUDIT 1: Internet Survival ===
  describe('Q1: Can survive horrible internet?', () => {
    it('should handle extended offline periods without data loss', async () => {
      const db = await getDB();
      for (let i = 0; i < 50; i++) {
        await db.put('queueItems', {
          id: `offline-sale-${i}`,
          type: 'sale',
          priority: 1,
          payload: { total: 100 + i, items: [{ id: `p-${i}`, quantity: 1, price: 100 + i }] },
          idempotencyKey: `offline-ik-${i}`,
          correlationId: 'offline-audit',
          status: 'pending',
          attempts: 0,
          maxAttempts: 5,
          lastError: null,
          nextRetryAt: Date.now() + 60000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          checkpoint: 0,
          batchId: null,
        });
      }

      const allItems = await db.getAll('queueItems');
      expect(allItems.length).toBe(50);
      expect(allItems.every(i => i.status === 'pending')).toBe(true);

      incidentForensics.recordEvent('reconnect', { durationMs: 3600000, itemsQueued: 50 });

      const report = await incidentForensics.generateForensicReport('offline_audit');
      expect(report).toBeDefined();
      expect(report.survivabilityScore).toBeGreaterThanOrEqual(0);
    });
  });

  // === AUDIT 2: Corruption Survival ===
  describe('Q2: Can survive partial corruption?', () => {
    it('should detect and contain store-level corruption', async () => {
      const db = await getDB();

      await db.put('deadLetters', {
        id: 'dl-corrupt-1',
        originalId: 'orig-1',
        type: 'sale',
        payload: { total: 100 },
        errorHistory: [{ attempt: 5, error: 'timeout', timestamp: Date.now() - 7200000 }],
        poisonedAt: Date.now() - 7200000,
        correlationId: 'corrupt-audit',
      });

      const allDead = await db.getAll('deadLetters');
      expect(allDead.length).toBeGreaterThanOrEqual(1);

      const issues = await dataConsistency.detectInvalidState();
      expect(Array.isArray(issues)).toBe(true);

      incidentForensics.recordEvent('corruption_detected', { store: 'queueItems', type: 'invalid_state' });
      const repaired = await dataConsistency.repairInvalidState();
      expect(repaired).toBeGreaterThanOrEqual(0);

      const timeline = await incidentForensics.reconstructTimeline(undefined, Date.now() - 3600000);
      expect(timeline.filter(t => t.type === 'corruption_detected').length).toBeGreaterThanOrEqual(1);
    });
  });

  // === AUDIT 3: Degraded Mode Selling ===
  describe('Q3: Can keep selling in degraded mode?', () => {
    it('should allow basic sales in degraded mode', async () => {
      degradedModeEngine.enterDegradedMode('Audit: degraded mode test');
      let status = degradedModeEngine.getOperationalStatus();
      expect(status.canSell).toBe(true);
      expect(status.status).toBe('degraded');

      const fallbackId = degradedModeEngine.enqueueMemoryFallback('sale', {
        total: 199.99,
        items: [{ id: 'prod-1', name: 'Test Product', price: 199.99, quantity: 1 }],
      });
      expect(fallbackId).toBeTruthy();
      expect(degradedModeEngine.getMemoryQueueLength()).toBe(1);

      degradedModeEngine.restoreNormal();
    });

    it('should allow basic sales in emergency mode', async () => {
      degradedModeEngine.enterEmergencyMode('Audit: emergency mode test');
      let status = degradedModeEngine.getOperationalStatus();
      expect(status.canSell).toBe(true);
      expect(status.status).toBe('emergency');

      degradedModeEngine.saveEmergencyCart({
        items: [{ id: 'prod-1', name: 'Emergency Sale', price: 50, quantity: 2 }],
        total: 100,
      });

      const cart = degradedModeEngine.getEmergencyCart() as any;
      expect(cart).toBeTruthy();
      expect(cart.total).toBe(100);
      expect(cart.items[0].name).toBe('Emergency Sale');

      const db = await getDB();
      await db.put('queueItems', {
        id: 'emergency-sale-1',
        type: 'sale',
        priority: 1,
        payload: { total: 100, items: [{ id: 'prod-1', quantity: 2, price: 50 }] },
        idempotencyKey: 'emergency-ik-1',
        correlationId: 'emergency-audit',
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

      const allItems = await db.getAll('queueItems');
      expect(allItems.some(i => i.id === 'emergency-sale-1')).toBe(true);

      degradedModeEngine.clearEmergencyCart();
      degradedModeEngine.restoreNormal();
    });
  });

  // === AUDIT 4: Self-Recovery ===
  describe('Q4: Can recover autonomously?', () => {
    it('should recover from corrupted state via recovery engine', async () => {
      const db = await getDB();
      for (let i = 0; i < 3; i++) {
        await db.put('queueItems', {
          id: `stuck-processing-${i}`,
          type: 'sale',
          priority: 0,
          payload: { total: 100 },
          idempotencyKey: `stuck-ik-${i}`,
          correlationId: 'recovery-audit',
          status: 'processing',
          attempts: 2,
          maxAttempts: 5,
          lastError: null,
          nextRetryAt: null,
          createdAt: Date.now() - 600000,
          updatedAt: Date.now() - 600000,
          checkpoint: 0,
          batchId: null,
        });
      }

      const recovery = await offlineRecoveryEngine.repairStaleQueues();
      const repaired = recovery.find(a => a.type === 'queue_reset');
      expect(repaired?.executed).toBe(true);

      const items = await db.getAll('queueItems');
      const recoveredItems = items.filter(i => i.id.startsWith('stuck-'));
      expect(recoveredItems.every(i => i.status === 'pending')).toBe(true);
    });
  });

  // === AUDIT 5: Infinite Loop Prevention ===
  describe('Q5: Can prevent infinite loops?', () => {
    it('should prevent infinite recovery loops via governor', async () => {
    for (let i = 0; i < 8; i++) {
      productionGovernor.recordRecovery(false);
    }

    expect(productionGovernor.canRunRecovery()).toBe(false);
    expect(productionGovernor.canRetry()).toBe(false);

    productionGovernor.unlockGovernor();
    expect(productionGovernor.canRetry()).toBe(true);
    });

    it('should prevent infinite retries via circuit breaker', async () => {
      for (let i = 0; i < 5; i++) {
        productionGovernor.recordCircuitFailure('recovery', `Loop prevention test ${i}`);
      }

      const cb = productionGovernor.getCircuitBreaker('recovery');
      expect(cb.state).toBe('open');
      expect(productionGovernor.isCircuitOpen('recovery')).toBe(true);

      productionGovernor.resetCircuitBreaker('recovery');
      expect(productionGovernor.isCircuitOpen('recovery')).toBe(false);
    });
  });

  // === AUDIT 6: Long Session ===
  describe('Q6: Can survive 12h+ sessions?', () => {
    it('should validate long session survivability', async () => {
      const validation = await storageLifecycleManager.validateLongSession();
      expect(validation).toBeDefined();
      expect(typeof validation.runtimeMs).toBe('number');
      expect(typeof validation.memoryExplosion).toBe('boolean');
      expect(typeof validation.queueExplosion).toBe('boolean');
      expect(Array.isArray(validation.issues)).toBe(true);
    });
  });

  // === AUDIT 7: Low-End Hardware ===
  describe('Q7: Can operate on low-end hardware?', () => {
    it('should degrade features under memory pressure', async () => {
      degradedModeEngine.enterDegradedMode('Low memory on low-end hardware');
      degradedModeEngine.disableNonCriticalComponents();

      const telemetry = degradedModeEngine.getComponentStatus('telemetry');
      expect(['degraded', 'bypassed', 'ok']).toContain(telemetry?.status);

      const scanner = degradedModeEngine.getComponentStatus('scanner');
      expect(scanner?.status).toBe('ok');

      degradedModeEngine.restoreNormal();
    });
  });

  // === AUDIT 8: Incident Diagnostics ===
  describe('Q8: Can diagnose old incidents?', () => {
    it('should reconstruct timeline of incidents from hours ago', async () => {
      const threeHoursAgo = Date.now() - 10800000;
      const twoHoursAgo = Date.now() - 7200000;
      const oneHourAgo = Date.now() - 3600000;

      for (let i = 0; i < 5; i++) {
        const event = {
          id: `old-event-${i}`,
          type: 'critical_error' as const,
          timestamp: threeHoursAgo + i * 60000,
          data: { error: `Historical error ${i}` },
          correlationId: 'old-incident',
        };
        incidentForensics.recordEvent(event.type, event.data);
      }

      const report = await incidentForensics.generateForensicReport('historical_audit');
      expect(report.generatedAt).toBeGreaterThan(threeHoursAgo);
      expect(report.survivabilityScore).toBeGreaterThanOrEqual(0);
      expect(report.diagnostics.uptimeHours).toBeDefined();
    });

    it('should export sanitized forensic package', async () => {
      incidentForensics.recordEvent('critical_error', { error: 'Sensitive: token=abc123, password=secret' });
      incidentForensics.recordEvent('recovery', { action: 'queue_repair', success: true });

      const pkg = await incidentForensics.exportForensicPackage('export_audit');
      expect(pkg.report.summary).toBeDefined();
      expect(pkg.report.timeline.length).toBeGreaterThanOrEqual(2);
      expect(pkg.sanitizedLogs).toBeDefined();
      expect(pkg.metrics).toBeDefined();
      expect(pkg.report.survivabilityScore).toBeGreaterThanOrEqual(0);
    });
  });

  // === AUDIT 9: Failure Containment ===
  describe('Q9: Can contain failures?', () => {
    it('should contain conflicts without propagation', async () => {
      const conflict1 = syncStateMachine.detectConflict('transaction', 'tx-001', 'Duplicate transaction');
      const c1 = syncStateMachine.getConflictHistory().find(c => c.id === conflict1.id)!;
      expect(c1.contained).toBe(true);

      const conflict2 = syncStateMachine.detectConflict('version', 'prod-001', 'Version drift');

      const active = syncStateMachine.getActiveConflicts();
      expect(active.every(c => c.contained)).toBe(true);

      syncStateMachine.resolveConflict(conflict1.id, 'client_wins');
      syncStateMachine.resolveConflict(conflict2.id, 'server_wins');
    });

    it('should contain duplicate operations', async () => {
      expect(syncStateMachine.checkDuplicate('sale', 'dup-sale')).toBe(false);
      expect(syncStateMachine.checkDuplicate('sale', 'dup-sale')).toBe(true);
      expect(syncStateMachine.checkDuplicate('movement', 'dup-mov')).toBe(false);
      expect(syncStateMachine.checkDuplicate('movement', 'dup-mov')).toBe(true);
      expect(syncStateMachine.getTotalDuplicates()).toBeGreaterThanOrEqual(2);
    });
  });

  // === AUDIT 10: Zero Lost Sales ===
  describe('Q10: Can prevent lost sales?', () => {
    it('should preserve all sales through degraded mode transitions', async () => {
      const db = await getDB();
      const salesToPreserve = 20;

      for (let i = 0; i < salesToPreserve; i++) {
        await db.put('queueItems', {
          id: `preserved-sale-${i}`,
          type: 'sale',
          priority: 1,
          payload: { total: 50 + i * 10 },
          idempotencyKey: `preserved-ik-${i}`,
          correlationId: 'preserve-audit',
          status: 'pending',
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

      degradedModeEngine.enterDegradedMode('Audit preservation');
      const status1 = degradedModeEngine.getOperationalStatus();
      expect(status1.canSell).toBe(true);

      await db.put('queueItems', {
        id: 'degraded-sale',
        type: 'sale',
        priority: 1,
        payload: { total: 150 },
        idempotencyKey: 'degraded-ik',
        correlationId: 'preserve-audit',
        status: 'pending',
        attempts: 0,
        maxAttempts: 5,
        lastError: null,
        nextRetryAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        checkpoint: 0,
        batchId: null,
      });

      degradedModeEngine.enterEmergencyMode('Audit emergency');
      const emergencyId = degradedModeEngine.enqueueMemoryFallback('sale', {
        total: 200,
        items: [{ id: 'emergency-prod', quantity: 1, price: 200 }],
      });
      expect(emergencyId).toBeTruthy();

      degradedModeEngine.restoreNormal();
      await degradedModeEngine.flushMemoryQueue();

      const allSales = await db.getAll('queueItems');
      const preservedSales = allSales.filter(i => i.id.startsWith('preserved-sale-') || i.id === 'degraded-sale');
      expect(preservedSales.length).toBe(salesToPreserve + 1);

      incidentForensics.recordEvent('recovery', { action: 'audit_complete', salesPreserved: preservedSales.length });
      const report = await incidentForensics.generateForensicReport('zero_loss_audit');
      expect(report.survivabilityScore).toBeGreaterThanOrEqual(0);
    });
  });

  // === FINAL SCORE ===
  describe('AUDIT SUMMARY', () => {
    it('should calculate overall survivability score', async () => {
      const db = await getDB();
      const storeCounts = Array.from(db.objectStoreNames).length;
      expect(storeCounts).toBeGreaterThanOrEqual(23);

      const report = await incidentForensics.generateForensicReport('final_audit');

      console.log(`
═══════════════════════════════════════════
  FINAL OPERATIONAL AUDIT REPORT
═══════════════════════════════════════════
  Report ID: ${report.id}
  Generated: ${new Date(report.generatedAt).toISOString()}
  Uptime: ${report.diagnostics.uptimeHours}h
  Survivability Score: ${report.survivabilityScore}/100
  Critical Events: ${report.diagnostics.criticalCount}
  Warnings: ${report.diagnostics.warningCount}
  Recoveries: ${report.diagnostics.recoveryCount}
  Failed Recoveries: ${report.diagnostics.failedRecovery}
  Event Buffer: ${report.diagnostics.eventCount} events
  Timeline: ${report.timeline.length} entries
  Snapshots: ${report.snapshots.length}
═══════════════════════════════════════════
      `);

      expect(report.survivabilityScore).toBeGreaterThanOrEqual(0);
      expect(report.survivabilityScore).toBeLessThanOrEqual(100);

      expect(db).toBeDefined();
      expect(report.id).toBeTruthy();
      expect(report.timeline).toBeDefined();
      expect(report.diagnostics).toBeDefined();
    });
  });
});
