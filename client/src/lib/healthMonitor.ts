import { checkDBHealth } from './db';
import { getTransactionQueue, getSyncStatusV2 } from './syncEngineV2';
import { createLogger, startTimer, endTimer } from './structuredLogger';
import { getAuditLogger } from './auditLogger';

const logger = createLogger('HealthMonitor');
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ─── Health Check Types ───

export interface HealthStatus {
  ok: boolean;
  checks: {
    server: ServerHealth;
    indexedDB: DBHealth;
    sync: SyncHealth;
    queue: QueueHealth;
    memory: MemoryHealth;
    worker: WorkerHealth;
    audit: AuditHealth;
  };
  timestamp: string;
}

export interface ServerHealth {
  ok: boolean;
  latencyMs: number;
  error: string | null;
}

export interface DBHealth {
  ok: boolean;
  latencyMs: number;
  storeCounts: Record<string, number>;
  error: string | null;
}

export interface SyncHealth {
  ok: boolean;
  pendingCount: number;
  lastSyncAt: number | null;
  errorRate: number;
  networkQuality: string;
}

export interface QueueHealth {
  ok: boolean;
  queueDepth: number;
  deadLetterCount: number;
  processingCount: number;
  running: boolean;
}

export interface MemoryHealth {
  ok: boolean;
  usedMB: number;
  totalMB: number;
  percentage: number;
  lowMemory: boolean;
}

export interface WorkerHealth {
  ok: boolean;
  alive: boolean;
  lastHeartbeat: number | null;
}

export interface AuditHealth {
  ok: boolean;
  chainValid: boolean | null;
  totalEvents: number;
}

// ─── Health Monitor ───

export class HealthMonitor {
  private workerAlive = false;
  private workerHeartbeat: number | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  init(): void {
    // Start worker heartbeat
    this.heartbeatTimer = setInterval(() => {
      this.workerAlive = true;
      this.workerHeartbeat = Date.now();
    }, 30000);

    // Periodic health checks
    this.checkInterval = setInterval(async () => {
      const status = await this.check();
      if (!status.ok) {
        logger.warn('Health check degraded', status);
      }
      window.dispatchEvent(new CustomEvent('health-status', { detail: status }));
    }, 60000);

    logger.info('Health monitor initialized');
  }

  destroy(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.checkInterval) clearInterval(this.checkInterval);
  }

  getWorkerHeartbeat(): { alive: boolean; lastHeartbeat: number | null } {
    return { alive: this.workerAlive, lastHeartbeat: this.workerHeartbeat };
  }

  async checkServer(): Promise<ServerHealth> {
    const isStaticEnv = typeof window !== 'undefined' && (
      window.location.hostname.includes('github.io') || 
      window.location.hostname.includes('github.com')
    );

    if (isStaticEnv) {
      return { ok: true, latencyMs: 0, error: null };
    }

    startTimer('health-server');
    try {
      const res = await fetch(`${API_BASE}/health/ready`, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      const duration = endTimer('health-server', 'HealthMonitor', 'Server health check');
      const ok = res.ok;
      return { ok, latencyMs: duration, error: ok ? null : `HTTP ${res.status}` };
    } catch (e) {
      endTimer('health-server', 'HealthMonitor', 'Server health check FAILED');
      return { ok: false, latencyMs: 5000, error: e instanceof Error ? e.message : 'Unknown' };
    }
  }

  async checkIndexedDB(): Promise<DBHealth> {
    const result = await checkDBHealth();
    return {
      ok: result.ok,
      latencyMs: result.latencyMs,
      storeCounts: result.storeCounts,
      error: result.error,
    };
  }

  async checkSync(): Promise<SyncHealth> {
    try {
      const status = await getSyncStatusV2();
      return {
        ok: status.queueStats.dead === 0 && status.networkQuality !== 'dead',
        pendingCount: status.queueStats.pending,
        lastSyncAt: null,
        errorRate: status.queueStats.dead > 0 ? status.queueStats.dead / Math.max(1, status.queueStats.delivered + status.queueStats.dead) : 0,
        networkQuality: status.networkQuality,
      };
    } catch (e) {
      return {
        ok: false,
        pendingCount: 0,
        lastSyncAt: null,
        errorRate: 1,
        networkQuality: 'unknown',
      };
    }
  }

  async checkQueue(): Promise<QueueHealth> {
    try {
      const queue = getTransactionQueue();
      const stats = await queue.getStats();
      return {
        ok: stats.dead < 10,
        queueDepth: stats.pending + stats.processing,
        deadLetterCount: stats.deadLetterCount,
        processingCount: stats.processing,
        running: true,
      };
    } catch {
      return { ok: false, queueDepth: 0, deadLetterCount: 0, processingCount: 0, running: false };
    }
  }

  async checkMemory(): Promise<MemoryHealth> {
    try {
      const mem = (performance as any).memory;
      if (mem) {
        const usedMB = Math.round(mem.usedJSHeapSize / 1048576);
        const totalMB = Math.round(mem.jsHeapSizeLimit / 1048576);
        const percentage = Math.round((usedMB / totalMB) * 100);
        return {
          ok: percentage < 80,
          usedMB,
          totalMB,
          percentage,
          lowMemory: percentage > 70,
        };
      }
      return { ok: true, usedMB: 0, totalMB: 0, percentage: 0, lowMemory: false };
    } catch {
      return { ok: true, usedMB: 0, totalMB: 0, percentage: 0, lowMemory: false };
    }
  }

  async checkWorker(): Promise<WorkerHealth> {
    return {
      ok: this.workerAlive,
      alive: this.workerAlive,
      lastHeartbeat: this.workerHeartbeat,
    };
  }

  async checkAudit(): Promise<AuditHealth> {
    try {
      const audit = getAuditLogger();
      const verification = await audit.verifyChain();
      return {
        ok: verification.valid,
        chainValid: verification.valid,
        totalEvents: verification.totalEvents,
      };
    } catch {
      return { ok: true, chainValid: null, totalEvents: 0 };
    }
  }

  async check(): Promise<HealthStatus> {
    const [server, indexedDB, sync, queue, memory, worker, audit] = await Promise.all([
      this.checkServer(),
      this.checkIndexedDB(),
      this.checkSync(),
      this.checkQueue(),
      this.checkMemory(),
      this.checkWorker(),
      this.checkAudit(),
    ]);

    const ok = server.ok && indexedDB.ok && sync.ok && queue.ok && worker.ok && audit.ok;

    return {
      ok,
      checks: { server, indexedDB, sync, queue, memory, worker, audit },
      timestamp: new Date().toISOString(),
    };
  }
}

// ─── Singleton ───

let instance: HealthMonitor | null = null;

export function getHealthMonitor(): HealthMonitor {
  if (!instance) {
    instance = new HealthMonitor();
  }
  return instance;
}
