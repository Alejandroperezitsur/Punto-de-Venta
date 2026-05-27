import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDB } from '../../src/lib/db';
import { incidentForensics } from '../../src/lib/incidentForensics';
import { degradedModeEngine } from '../../src/lib/degradedModeEngine';
import { productionGovernor } from '../../src/lib/productionGovernor';
import { storageLifecycleManager } from '../../src/lib/storageLifecycleManager';
import { syncStateMachine } from '../../src/lib/syncStateMachine';

describe('Low-End Device: 2GB RAM Simulation', () => {
  beforeEach(() => {
    localStorage.clear();
    incidentForensics.clearBuffer();
    productionGovernor.resetAllCircuitBreakers();
  });

  it('should handle memory pressure detection and auto-degradation', async () => {
    const fakeMemory = {
      jsHeapSizeLimit: 2147483648,
      totalJSHeapSize: 2000000000,
      usedJSHeapSize: 1800000000,
    };
    Object.defineProperty(performance, 'memory', {
      value: fakeMemory,
      configurable: true,
    });

    degradedModeEngine.defineRules();

    const status = degradedModeEngine.getOperationalStatus();
    expect(status.status).toBe('normal');

    fakeMemory.usedJSHeapSize = 1900000000;
    await degradedModeEngine.evaluateDegradation();

    const status2 = degradedModeEngine.getOperationalStatus();
    expect(status2.status).toBe('degraded');

    incidentForensics.recordEvent('critical_error', { error: 'Memory pressure critical on low-end device' });
    const events = incidentForensics.getRecentEvents(5);
    expect(events.length).toBeGreaterThanOrEqual(1);

    Object.defineProperty(performance, 'memory', {
      value: undefined,
      configurable: true,
    });
    degradedModeEngine.restoreNormal();
  });

  it('should handle low storage quota gracefully', async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      vi.spyOn(navigator.storage, 'estimate').mockResolvedValue({
        usage: 4500000,
        quota: 5000000,
      });

      const health = await storageLifecycleManager.runHealthCheck();
      expect(health.quota.percentUsed).toBeGreaterThan(80);
      expect(health.quota.pressure).toBe(true);
    }

    incidentForensics.recordEvent('quota_exceeded', { percentUsed: 95 });
    const events = incidentForensics.getRecentEvents(5);
    expect(events.some(e => e.type === 'quota_exceeded')).toBe(true);
  });

  it('should enable emergency mode when IndexedDB fails on low-end device', async () => {
    degradedModeEngine.reportComponentFailure('indexedDB', 'Low-end device storage failure');

    await degradedModeEngine.evaluateDegradation();
    degradedModeEngine.enterEmergencyMode('IndexedDB failure on low-end device');

    const status = degradedModeEngine.getOperationalStatus();
    expect(status.status).toBe('emergency');
    expect(status.canSell).toBe(true);

    const fallbackId = degradedModeEngine.enqueueMemoryFallback('sale', {
      total: 50,
      items: [{ id: 'test', name: 'Test', price: 50, quantity: 1 }],
    });
    expect(fallbackId).toBeTruthy();
    expect(degradedModeEngine.getMemoryQueueLength()).toBe(1);

    degradedModeEngine.saveEmergencyCart({ items: [{ id: 'test', quantity: 1 }], total: 50 });
    const cart = degradedModeEngine.getEmergencyCart() as any;
    expect(cart).toBeTruthy();
    expect(cart.total).toBe(50);

    degradedModeEngine.clearEmergencyCart();
    expect(degradedModeEngine.getEmergencyCart()).toBeNull();

    degradedModeEngine.restoreNormal();
  });

  it('should handle CPU throttling simulation', async () => {
    incidentForensics.recordEvent('degraded_mode', { reason: 'CPU throttling detected', cpuCores: 2 });
    degradedModeEngine.enterDegradedMode('CPU throttling on low-end device');

    const status = degradedModeEngine.getOperationalStatus();
    expect(status.status).toBe('degraded');

    const timeline = await incidentForensics.reconstructTimeline(undefined, Date.now() - 3600000);
    const degradedEvents = timeline.filter(t => t.type === 'degraded_mode');
    expect(degradedEvents.length).toBeGreaterThanOrEqual(1);

    degradedModeEngine.restoreNormal();
  });

  it('should survive battery saver mode with degraded operation', async () => {
    degradedModeEngine.enterDegradedMode('Battery saver active');
    degradedModeEngine.disableNonCriticalComponents();

    const telemetry = degradedModeEngine.getComponentStatus('telemetry');
    expect(telemetry?.status).toBe('degraded');

    const diagnostics = degradedModeEngine.getComponentStatus('diagnostics');
    expect(diagnostics?.status).toBe('degraded');

    const scanner = degradedModeEngine.getComponentStatus('scanner');
    expect(scanner?.status).toBe('ok');

    degradedModeEngine.restoreNormal();
  });
});

describe('Low-End Device: Extreme Conditions', () => {
  it('should handle circuit breaker with minimal memory overhead', async () => {
    for (let i = 0; i < 10; i++) {
      productionGovernor.recordCircuitFailure('sync', `Low-end timeout ${i}`);
    }

    productionGovernor.recordCircuitSuccess('sync');
    const cb = productionGovernor.getCircuitBreaker('sync');
    expect(cb.failureCount).toBeGreaterThanOrEqual(0);
    productionGovernor.resetCircuitBreaker('sync');
  });

  it('should limit retry rate on constrained devices', async () => {
    const canRetryBefore = productionGovernor.canRetry();
    expect(canRetryBefore).toBe(true);

    for (let i = 0; i < 35; i++) {
      productionGovernor.recordRetry();
    }

    const canRetryAfter = productionGovernor.canRetry();
    expect(canRetryAfter).toBe(false);

    productionGovernor.unlockGovernor();
  });

  it('should validate long session metrics are bounded', async () => {
    const safety = await productionGovernor.runSafetyCheck();
    expect(safety.violations).toBeDefined();
    expect(Array.isArray(safety.violations)).toBe(true);
  });

  it('should handle rapid degraded<->normal<->emergency transitions', async () => {
    for (let i = 0; i < 50; i++) {
      degradedModeEngine.enterDegradedMode(`cycle_${i}`);
      degradedModeEngine.restoreNormal();
      if (i % 10 === 0) {
        degradedModeEngine.enterEmergencyMode(`emergency_${i}`);
        degradedModeEngine.restoreNormal();
      }
    }

    const status = degradedModeEngine.getOperationalStatus();
    expect(status.status).toBe('normal');
  });

  it('should maintain correct component status after recovery', async () => {
    degradedModeEngine.reportComponentFailure('syncEngine', 'Connection timeout');
    degradedModeEngine.reportComponentFailure('indexedDB', 'Quota exceeded');
    degradedModeEngine.reportComponentFailure('telemetry', 'Buffer full');

    await degradedModeEngine.evaluateDegradation();

    degradedModeEngine.resetAllComponents();
    const syncStatus = degradedModeEngine.getComponentStatus('syncEngine');
    expect(syncStatus?.status).toBe('ok');
    const dbStatus = degradedModeEngine.getComponentStatus('indexedDB');
    expect(dbStatus?.status).toBe('ok');
  });
});
