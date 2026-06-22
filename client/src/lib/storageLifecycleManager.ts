import { getDB } from './db'
import { createLogger } from './structuredLogger'
import { incidentForensics } from './incidentForensics'
import { degradedModeEngine } from './degradedModeEngine'
import { metrics } from './metricsCollector'

const logger = createLogger('StorageLifecycle')

export interface StorageHealthReport {
  ok: boolean
  indexedDB: {
    ok: boolean
    storeCounts: Record<string, number>
    totalRecords: number
    estimatedSizeMB: number
  }
  localStorage: {
    ok: boolean
    usageBytes: number
    quotaBytes: number
    percentUsed: number
  }
  quota: {
    usage: number
    quota: number
    percentUsed: number
    pressure: boolean
  }
  cacheGrowth: {
    apiCacheCount: number
    metricsCount: number
    syncLogCount: number
  }
  queueGrowth: {
    total: number
    pending: number
    deadLetter: number
  }
  snapshotAccumulation: number
}

export interface CleanupAction {
  id: string
  action: string
  store: string
  removedCount: number
  freedBytes: number
  durationMs: number
  timestamp: number
}

export interface StoragePressureEvent {
  id: string
  type: 'quota_exceeded' | 'low_storage' | 'failed_write' | 'write_deferred'
  timestamp: number
  details: string
  resolved: boolean
  resolvedAt: number | null
}

const PRESSURE_THRESHOLD = 0.85
const CRITICAL_PRESSURE_THRESHOLD = 0.95
const CLEANUP_INTERVAL = 300000
const METRICS_RETENTION = 86400000
const DIAGNOSTIC_SNAPSHOT_RETENTION = 259200000
const LOG_RETENTION = 259200000
const CACHE_RETENTION = 604800000
const SYNC_LOG_RETENTION = 259200000

let cleanupTimer: ReturnType<typeof setInterval> | null = null
let healthCheckTimer: ReturnType<typeof setInterval> | null = null
let sessionStartTime = Date.now()
let totalDeferredWrites = 0
let totalFailedWrites = 0
let lastCompactionAt = 0

const pressureEvents: StoragePressureEvent[] = []
const cleanupActions: CleanupAction[] = []
const MAX_CLEANUP_HISTORY = 20

function uid(): string {
  return crypto.randomUUID?.() || 'slm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
}

async function estimateIndexedDBSize(): Promise<number> {
  try {
    const db = await getDB()
    let totalSize = 0
    for (const name of Array.from(db.objectStoreNames)) {
      const all = await db.getAll(name)
      for (const record of all) {
        totalSize += new TextEncoder().encode(JSON.stringify(record)).length
      }
    }
    return Math.round(totalSize / 1048576 * 100) / 100
  } catch { return 0 }
}

function getLocalStorageUsage(): { usageBytes: number; quotaBytes: number } {
  let usage = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      usage += key.length * 2
      const val = localStorage.getItem(key)
      if (val) usage += val.length * 2
    }
  }
  return { usageBytes: usage, quotaBytes: 5242880 }
}

async function getQuotaEstimate(): Promise<{ usage: number; quota: number }> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const est = await navigator.storage.estimate()
      return { usage: est.usage || 0, quota: est.quota || 0 }
    }
  } catch { /* noop */ }
  return { usage: 0, quota: 0 }
}

export const storageLifecycleManager = {
  init(): void {
    sessionStartTime = Date.now()
    healthCheckTimer = setInterval(() => this.runHealthCheck(), 60000)
    cleanupTimer = setInterval(() => this.runAutoCleanup(), CLEANUP_INTERVAL)
    logger.info('Storage lifecycle manager initialized')
  },

  destroy(): void {
    if (healthCheckTimer) clearInterval(healthCheckTimer)
    if (cleanupTimer) clearInterval(cleanupTimer)
  },

  async runHealthCheck(): Promise<StorageHealthReport> {
    let indexedDBOk = false
    let storeCounts: Record<string, number> = {}
    let totalRecords = 0

    try {
      const db = await getDB()
      for (const name of Array.from(db.objectStoreNames)) {
        const count = await db.count(name)
        storeCounts[name] = count
        totalRecords += count
      }
      indexedDBOk = true
    } catch {
      indexedDBOk = false
      degradedModeEngine.reportComponentFailure('indexedDB', 'Health check failed')
    }

    const ls = getLocalStorageUsage()
    const quota = await getQuotaEstimate()

    let apiCacheCount = 0
    let metricsCount = 0
    let syncLogCount = 0
    try {
      const db = await getDB()
      apiCacheCount = await db.count('apiCache')
      metricsCount = await db.count('metrics')
      syncLogCount = await db.count('syncLog')
    } catch { /* noop */ }

    let queueTotal = 0
    let queuePending = 0
    let queueDeadLetter = 0
    try {
      const db = await getDB()
      const allItems = await db.getAll('queueItems')
      queueTotal = allItems.length
      queuePending = allItems.filter(i => i.status === 'pending').length
      const dl = await db.count('deadLetters')
      queueDeadLetter = dl
    } catch { /* noop */ }

    let snapshotCount = 0
    try {
      const db = await getDB()
      snapshotCount = await db.count('snapshots')
    } catch { /* noop */ }

    const estimatedSizeMB = await estimateIndexedDBSize()

    const quotaPercent = quota.quota > 0 ? (quota.usage / quota.quota) : 0
    const lsPercent = ls.quotaBytes > 0 ? (ls.usageBytes / ls.quotaBytes) : 0

    const ok = indexedDBOk && quotaPercent < CRITICAL_PRESSURE_THRESHOLD

    const report: StorageHealthReport = {
      ok,
      indexedDB: { ok: indexedDBOk, storeCounts, totalRecords, estimatedSizeMB },
      localStorage: { ok: lsPercent < 0.9, usageBytes: ls.usageBytes, quotaBytes: ls.quotaBytes, percentUsed: Math.round(lsPercent * 100) },
      quota: {
        usage: quota.usage,
        quota: quota.quota,
        percentUsed: Math.round(quotaPercent * 100),
        pressure: quotaPercent > PRESSURE_THRESHOLD,
      },
      cacheGrowth: { apiCacheCount, metricsCount, syncLogCount },
      queueGrowth: { total: queueTotal, pending: queuePending, deadLetter: queueDeadLetter },
      snapshotAccumulation: snapshotCount,
    }

    metrics.setGauge('pos_storage_quota_percent', {}, Math.round(quotaPercent * 100))
    metrics.setGauge('pos_storage_estimated_mb', {}, estimatedSizeMB)
    metrics.setGauge('pos_storage_queue_total', {}, queueTotal)
    metrics.setGauge('pos_storage_cache_entries', {}, apiCacheCount)

    if (quotaPercent > PRESSURE_THRESHOLD) {
      logger.warn(`Storage pressure: ${Math.round(quotaPercent * 100)}% used`)
      incidentForensics.recordEvent('quota_exceeded', { percentUsed: Math.round(quotaPercent * 100) })
      await this.handleStoragePressure(report)
    }

    if (!indexedDBOk) {
      logger.error('IndexedDB health check failed')
      incidentForensics.recordEvent('storage_failure', { error: 'Health check failed' })
    }

    return report
  },

  async runAutoCleanup(): Promise<CleanupAction[]> {
    const actions: CleanupAction[] = []
    const now = Date.now()

    const cleanupOps: Array<{ store: 'apiCache' | 'metrics' | 'syncLog'; retention: number; action: string; field: string }> = [
      {
        store: 'apiCache',
        retention: CACHE_RETENTION,
        action: 'stale_cache',
        field: 'updatedAt' as const,
      },
      {
        store: 'metrics',
        retention: METRICS_RETENTION,
        action: 'old_metrics',
        field: 'timestamp' as const,
      },
      {
        store: 'syncLog',
        retention: SYNC_LOG_RETENTION,
        action: 'stale_sync_log',
        field: 'timestamp' as const,
      },
    ]

    for (const op of cleanupOps) {
      try {
        const startTime = performance.now()
        const db = await getDB()
        const allRecords = await db.getAll(op.store)
        const cutoff = now - op.retention
        let removed = 0

        for (const record of allRecords) {
          const recordTime = (record as any)[op.field]
          if (recordTime && recordTime < cutoff) {
            await db.delete(op.store, record.id || record.request || record)
            removed++
          }
        }

        if (removed > 0) {
          const action: CleanupAction = {
            id: uid(),
            action: op.action,
            store: op.store,
            removedCount: removed,
            freedBytes: 0,
            durationMs: Math.round(performance.now() - startTime),
            timestamp: now,
          }
          actions.push(action)
          cleanupActions.push(action)
          if (cleanupActions.length > MAX_CLEANUP_HISTORY) cleanupActions.shift()
          logger.info(`Cleaned ${removed} records from ${op.store}`)
        }
      } catch (e) {
        logger.error(`Cleanup failed for ${op.store}`, e)
      }
    }

    const diagnosticCleanup = await this.cleanupDiagnosticSnapshots()
    actions.push(...diagnosticCleanup)

    const orphanCleanup = await this.cleanupOrphanedData()
    actions.push(...orphanCleanup)

    return actions
  },

  async cleanupDiagnosticSnapshots(): Promise<CleanupAction[]> {
    const actions: CleanupAction[] = []
    try {
      const db = await getDB()
      const allMetrics = await db.getAll('metrics')
      const diagnosticSnaps = allMetrics.filter((m: any) =>
        m.name === 'incident_snapshot' || m.name === 'forensic_report' || m.name === 'diagnostic_snapshot'
      )
      const cutoff = Date.now() - DIAGNOSTIC_SNAPSHOT_RETENTION
      let removed = 0
      for (const snap of diagnosticSnaps) {
        if (snap.timestamp && snap.timestamp < cutoff) {
          await db.delete('metrics', snap.id)
          removed++
        }
      }
      if (removed > 0) {
        actions.push({
          id: uid(), action: 'stale_diagnostics', store: 'metrics',
          removedCount: removed, freedBytes: 0, durationMs: 0, timestamp: Date.now(),
        })
        logger.info(`Cleaned ${removed} stale diagnostics`)
      }
    } catch { /* noop */ }
    return actions
  },

  async cleanupOrphanedData(): Promise<CleanupAction[]> {
    const actions: CleanupAction[] = []
    try {
      const db = await getDB()
      const checkpoints = await db.getAll('queueCheckpoints')
      let removed = 0
      for (const cp of checkpoints) {
        if (cp.lastProcessedId) {
          const exists = await db.get('queueItems', cp.lastProcessedId).catch(() => null)
          if (!exists) {
            await db.delete('queueCheckpoints', cp.id)
            removed++
          }
        }
      }
      if (removed > 0) {
        actions.push({
          id: uid(), action: 'orphan_checkpoints', store: 'queueCheckpoints',
          removedCount: removed, freedBytes: 0, durationMs: 0, timestamp: Date.now(),
        })
      }
    } catch { /* noop */ }

    try {
      const db = await getDB()
      const locks = await db.getAll('queueLocks')
      const now = Date.now()
      let removed = 0
      for (const lock of locks) {
        if (lock.expiresAt < now - 86400000) {
          await db.delete('queueLocks', lock.id)
          removed++
        }
      }
      if (removed > 0) {
        actions.push({
          id: uid(), action: 'expired_locks', store: 'queueLocks',
          removedCount: removed, freedBytes: 0, durationMs: 0, timestamp: Date.now(),
        })
      }
    } catch { /* noop */ }

    return actions
  },

  async handleStoragePressure(report: StorageHealthReport): Promise<void> {
    const event: StoragePressureEvent = {
      id: uid(),
      type: report.quota.percentUsed > CRITICAL_PRESSURE_THRESHOLD * 100 ? 'quota_exceeded' : 'low_storage',
      timestamp: Date.now(),
      details: `Storage at ${report.quota.percentUsed}% capacity`,
      resolved: false,
      resolvedAt: null,
    }
    pressureEvents.push(event)
    if (pressureEvents.length > 20) pressureEvents.shift()

    await this.runAutoCleanup()

    if (report.quota.percentUsed > CRITICAL_PRESSURE_THRESHOLD * 100) {
      logger.error('CRITICAL STORAGE PRESSURE - initiating emergency cleanup')
      metrics.setGauge('pos_storage_pressure_level', {}, 2)
    } else {
      metrics.setGauge('pos_storage_pressure_level', {}, 1)
    }

    event.resolved = true
    event.resolvedAt = Date.now()
  },

  async runCompaction(): Promise<boolean> {
    const now = Date.now()
    if (now - lastCompactionAt < 3600000) return false
    lastCompactionAt = now

    try {
      const db = await getDB()
      const tx = db.transaction('queueItems', 'readwrite')
      const allItems = await tx.store.getAll()
      const toRemove = allItems.filter(i =>
        (i.status === 'delivered' || i.status === 'done') &&
        i.updatedAt < now - 86400000
      )
      let removed = 0
      for (const item of toRemove) {
        await tx.store.delete(item.id)
        removed++
      }
      await tx.done
      if (removed > 0) logger.info(`Compaction: removed ${removed} old delivered items`)
      return removed > 0
    } catch (e) {
      logger.error('Compaction failed', e)
      return false
    }
  },

  deferWrite(reason: string): void {
    totalDeferredWrites++
    metrics.setGauge('pos_storage_deferred_writes', {}, totalDeferredWrites)
    logger.warn(`Write deferred: ${reason}`)
  },

  recordFailedWrite(error: string): void {
    totalFailedWrites++
    metrics.setGauge('pos_storage_failed_writes', {}, totalFailedWrites)
    incidentForensics.recordEvent('storage_failure', { error })
  },

  async checkWriteAvailability(): Promise<boolean> {
    try {
      const db = await getDB()
      const testKey = `_write_test_${Date.now()}`
      await db.put('metrics', { id: testKey, name: 'write_test', value: 1, labels: {}, timestamp: Date.now() })
      await db.delete('metrics', testKey)
      return true
    } catch {
      this.recordFailedWrite('Write availability check failed')
      return false
    }
  },

  async validateLongSession(): Promise<{
    runtimeMs: number
    memoryExplosion: boolean
    queueExplosion: boolean
    listenerAccumulation: boolean
    cacheRunaway: boolean
    issues: string[]
  }> {
    const runtimeMs = Date.now() - sessionStartTime
    const issues: string[] = []
    const runtimeHours = runtimeMs / 3600000

    let memExplosion = false
    const mem = (performance as any).memory
    if (mem && runtimeHours > 2) {
      const memPercent = mem.usedJSHeapSize / mem.totalJSHeapSize
      if (memPercent > 0.9) {
        memExplosion = true
        issues.push(`Memory at ${Math.round(memPercent * 100)}% after ${runtimeHours.toFixed(1)}h runtime`)
      }
    }

    let queueExplosion = false
    try {
      const db = await getDB()
      const allItems = await db.getAll('queueItems')
      if (allItems.length > 500 && runtimeHours > 2) {
        queueExplosion = true
        issues.push(`Queue at ${allItems.length} items after ${runtimeHours.toFixed(1)}h runtime`)
      }
    } catch { /* noop */ }

    let listenerAcc = false
    try {
      if (runtimeHours > 4) {
        const eventListeners = (window as any).__event_listener_count
        if (eventListeners && eventListeners > 200) {
          listenerAcc = true
          issues.push(`Event listener accumulation: ${eventListeners}`)
        }
      }
    } catch { /* noop */ }

    let cacheRunaway = false
    try {
      const db = await getDB()
      const cacheCount = await db.count('apiCache')
      if (cacheCount > 500 && runtimeHours > 2) {
        cacheRunaway = true
        issues.push(`Cache at ${cacheCount} entries after ${runtimeHours.toFixed(1)}h runtime`)
      }
    } catch { /* noop */ }

    return {
      runtimeMs,
      memoryExplosion: memExplosion,
      queueExplosion,
      listenerAccumulation: listenerAcc,
      cacheRunaway,
      issues,
    }
  },

  getPressureEvents(): StoragePressureEvent[] {
    return [...pressureEvents]
  },

  getCleanupHistory(): CleanupAction[] {
    return [...cleanupActions]
  },

  getTotalDeferredWrites(): number {
    return totalDeferredWrites
  },

  getTotalFailedWrites(): number {
    return totalFailedWrites
  },

  resetSession(): void {
    sessionStartTime = Date.now()
  },
}
