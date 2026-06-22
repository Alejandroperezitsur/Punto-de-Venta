import { getDB, type QueueItem } from './db'
import { createLogger } from './structuredLogger'
import { incidentForensics } from './incidentForensics'
import { degradedModeEngine } from './degradedModeEngine'
import { metrics } from './metricsCollector'

const logger = createLogger('SyncStateMachine')

export type SyncState = 'idle' | 'syncing' | 'retrying' | 'degraded' | 'conflicted' | 'recovered'

export interface SyncStateTransition {
  id: string
  from: SyncState
  to: SyncState
  timestamp: number
  reason: string
  duration: number
}

export interface SyncStateInfo {
  current: SyncState
  since: number
  lastSuccessAt: number | null
  lastErrorAt: number | null
  lastError: string | null
  transitionCount: number
  totalConflicts: number
  totalDuplicates: number
  activeConflicts: number
  consistencyValid: boolean
}

export interface ConflictRecord {
  id: string
  type: 'transaction' | 'version' | 'inventory' | 'idempotency'
  resourceId: string
  description: string
  detectedAt: number
  contained: boolean
  resolved: boolean
  resolvedAt: number | null
  resolution: 'client_wins' | 'server_wins' | 'merge' | 'discard' | null
}

const TRANSACTIONS_KEY_PREFIX = 'pos_completed_tx_'
const CONTAINMENT_WINDOW = 300000
const MAX_TRANSITIONS = 100
const MAX_CONFLICTS = 50

let currentState: SyncState = 'idle'
let stateSince = Date.now()
let lastSuccessAt: number | null = null
let lastErrorAt: number | null = null
let lastError: string | null = null
let transitionCount = 0
let totalConflicts = 0
let totalDuplicates = 0

const transitions: SyncStateTransition[] = []
let conflicts: ConflictRecord[] = []
let pendingContainment: Array<{ id: string; timestamp: number; resource: string }> = []
let duplicateDetectionCache = new Map<string, number>()
let checkInterval: ReturnType<typeof setInterval> | null = null
let listeners: Array<(info: SyncStateInfo) => void> = []

function uid(): string {
  return crypto.randomUUID?.() || 'ssm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
}

function transitionTo(newState: SyncState, reason: string): void {
  if (newState === currentState) return
  const from = currentState
  currentState = newState
  const timestamp = Date.now()
  const duration = timestamp - stateSince

  transitions.push({
    id: uid(), from, to: newState, timestamp, reason, duration,
  })
  if (transitions.length > MAX_TRANSITIONS) transitions.shift()

  transitionCount++
  stateSince = timestamp

  logger.info(`Sync state: ${from} -> ${newState} (${reason})`)
  incidentForensics.recordEvent('sync', { from, to: newState, reason, duration })
  metrics.setGauge('pos_sync_state', { state: newState }, 1)

  if (from === 'conflicted' || newState === 'recovered') {
    degradedModeEngine.reportComponentRecovery('syncEngine')
  }
  if (newState === 'degraded' || newState === 'conflicted') {
    degradedModeEngine.reportComponentFailure('syncEngine', reason)
  }
  if (newState === 'recovered') {
    degradedModeEngine.setComponentStatus('syncEngine', 'ok', 'Sync recovered')
  }

  notifyListeners()
}

function notifyListeners(): void {
  const info = getSyncStateInfo()
  for (const listener of listeners) {
    try { listener(info) } catch { /* noop */ }
  }
}

export const syncStateMachine = {
  init(): void {
    checkInterval = setInterval(() => this.runConsistencyValidation(), 60000)
    logger.info('Sync state machine initialized')
  },

  destroy(): void {
    if (checkInterval) clearInterval(checkInterval)
    listeners = []
  },

  subscribe(fn: (info: SyncStateInfo) => void): () => void {
    listeners.push(fn)
    return () => { listeners = listeners.filter(l => l !== fn) }
  },

  setIdle(): void {
    transitionTo('idle', 'No pending operations')
    lastError = null
  },

  setSyncing(reason = 'Processing queue'): void {
    transitionTo('syncing', reason)
  },

  setRetrying(reason = 'Retry after failure'): void {
    transitionTo('retrying', reason)
    lastErrorAt = Date.now()
  },

  setDegraded(reason: string): void {
    transitionTo('degraded', reason)
    lastError = reason
    lastErrorAt = Date.now()
  },

  setConflicted(reason: string): void {
    transitionTo('conflicted', reason)
    totalConflicts++
    lastError = reason
    lastErrorAt = Date.now()
  },

  setRecovered(reason = 'Sync recovered successfully'): void {
    transitionTo('recovered', reason)
    lastSuccessAt = Date.now()
    lastError = null
    setTimeout(() => {
      if (currentState === 'recovered') this.setIdle()
    }, 5000)
  },

  recordSuccess(): void {
    lastSuccessAt = Date.now()
    lastError = null
  },

  recordError(error: string): void {
    lastError = error
    lastErrorAt = Date.now()
    metrics.incrementCounter('pos_sync_errors', { type: 'sync_state' })
  },

  // --- Conflict Containment ---

  detectConflict(type: ConflictRecord['type'], resourceId: string, description: string): ConflictRecord {
    const existing = conflicts.find(c =>
      c.type === type && c.resourceId === resourceId && !c.resolved
    )
    if (existing) return existing

    const conflict: ConflictRecord = {
      id: uid(),
      type,
      resourceId,
      description,
      detectedAt: Date.now(),
      contained: false,
      resolved: false,
      resolvedAt: null,
      resolution: null,
    }
    conflicts.push(conflict)
    if (conflicts.length > MAX_CONFLICTS) conflicts.shift()
    totalConflicts++
    metrics.setGauge('pos_sync_conflicts', {}, totalConflicts)
    incidentForensics.recordEvent('corruption_detected', { type: 'conflict', resource: resourceId, description })

    if (this.shouldEscalate()) {
      this.setConflicted(`${type} conflict: ${description}`)
    } else {
      this.containConflict(conflict.id)
    }

    return conflict
  },

  containConflict(conflictId: string): boolean {
    const conflict = conflicts.find(c => c.id === conflictId)
    if (!conflict || conflict.contained) return false
    conflict.contained = true
    logger.warn(`Conflict contained: ${conflict.type} on ${conflict.resourceId}`)
    metrics.setGauge('pos_sync_contained_conflicts', {}, conflicts.filter(c => c.contained && !c.resolved).length)
    return true
  },

  resolveConflict(conflictId: string, resolution: ConflictRecord['resolution']): boolean {
    const conflict = conflicts.find(c => c.id === conflictId)
    if (!conflict || conflict.resolved) return false
    conflict.resolved = true
    conflict.resolvedAt = Date.now()
    conflict.resolution = resolution
    logger.info(`Conflict resolved: ${conflict.type} on ${conflict.resourceId} via ${resolution}`)
    this.setRecovered(`Conflict resolved: ${resolution}`)
    return true
  },

  getActiveConflicts(): ConflictRecord[] {
    return conflicts.filter(c => !c.resolved && !c.contained)
  },

  getConflictHistory(): ConflictRecord[] {
    return [...conflicts]
  },

  shouldEscalate(): boolean {
    const activeUncontained = conflicts.filter(c => !c.resolved && !c.contained).length
    return activeUncontained >= 3
  },

  // --- Duplicate Containment ---

  checkDuplicate(operationType: string, resourceId: string, windowMs = CONTAINMENT_WINDOW): boolean {
    const key = `${operationType}:${resourceId}`
    const lastSeen = duplicateDetectionCache.get(key)
    const now = Date.now()

    if (lastSeen && now - lastSeen < windowMs) {
      totalDuplicates++
      metrics.setGauge('pos_sync_duplicates', {}, totalDuplicates)
      metrics.incrementCounter('pos_duplicate_detections', { type: operationType })
      return true
    }

    duplicateDetectionCache.set(key, now)
    if (duplicateDetectionCache.size > 1000) {
      const oldest = duplicateDetectionCache.entries().next().value
      if (oldest) duplicateDetectionCache.delete(oldest[0])
    }
    return false
  },

  checkReconnectStorm(threshold = 5, windowMs = 300000): boolean {
    const now = Date.now()
    const recentReconnects = transitions.filter(t =>
      (t.to === 'syncing' || t.to === 'recovered') &&
      now - t.timestamp < windowMs
    )
    return recentReconnects.length >= threshold
  },

  getTotalDuplicates(): number {
    return totalDuplicates
  },

  // --- Eventual Consistency Validation ---

  async runConsistencyValidation(): Promise<{
    valid: boolean
    queueIntegrity: boolean
    transactionOrdering: boolean
    staleReplay: boolean
    orphanedOperations: boolean
    issues: string[]
  }> {
    const issues: string[] = []
    const result: {
      valid: boolean
      queueIntegrity: boolean
      transactionOrdering: boolean
      staleReplay: boolean
      orphanedOperations: boolean
      issues: string[]
    } = {
      valid: true,
      queueIntegrity: true,
      transactionOrdering: true,
      staleReplay: false,
      orphanedOperations: false,
      issues: [],
    }

    try {
      const db = await getDB()
      const allItems = await db.getAll('queueItems')

      const pendingItems = allItems.filter(i => i.status === 'pending')
      const processingItems = allItems.filter(i => i.status === 'processing')
      const deliveredItems = allItems.filter(i => i.status === 'delivered' || i.status === 'done')

      if (pendingItems.length > 200) {
        result.queueIntegrity = false
        issues.push(`Large pending queue: ${pendingItems.length} items`)
      }

      const now = Date.now()
      const stalePending = pendingItems.filter(i =>
        i.createdAt < now - 86400000 && i.nextRetryAt && i.nextRetryAt < now - 3600000
      )
      if (stalePending.length > 0) {
        result.staleReplay = true
        issues.push(`${stalePending.length} stale pending items (>24h old, not retried)`)
      }

      const orphans = processingItems.filter(i => i.updatedAt < now - 300000)
      if (orphans.length > 0) {
        result.orphanedOperations = true
        result.valid = false
        issues.push(`${orphans.length} orphaned processing items stuck >5min`)
      }

      const idempotencyKeys = new Map<string, string[]>()
      for (const item of allItems) {
        const existing = idempotencyKeys.get(item.idempotencyKey) || []
        existing.push(item.id)
        idempotencyKeys.set(item.idempotencyKey, existing)
      }
      for (const [key, ids] of idempotencyKeys.entries()) {
        if (ids.length > 1) {
          issues.push(`Duplicate idempotency key ${key}: ${ids.length} items`)
        }
      }

      const recentDelivered = deliveredItems.filter(i => i.updatedAt > now - 60000)
      if (recentDelivered.length > 50) {
        issues.push(`High deliver rate: ${recentDelivered.length} items delivered in last minute`)
      }

      if (!result.queueIntegrity || issues.length > 0) {
        this.setDegraded(`Consistency issues: ${issues.join('; ')}`)
      }

      result.valid = issues.length === 0 && result.queueIntegrity
      result.issues = issues
    } catch (e) {
      result.valid = false
      result.issues = [`Consistency validation error: ${e instanceof Error ? e.message : 'unknown'}`]
    }

    return result
  },

  getSyncStateInfo(): SyncStateInfo {
    return {
      current: currentState,
      since: stateSince,
      lastSuccessAt,
      lastErrorAt,
      lastError,
      transitionCount,
      totalConflicts,
      totalDuplicates,
      activeConflicts: this.getActiveConflicts().length,
      consistencyValid: true,
    }
  },

  getTransitions(limit = 20): SyncStateTransition[] {
    return transitions.slice(-limit)
  },

  reset(): void {
    currentState = 'idle'
    stateSince = Date.now()
    lastSuccessAt = null
    lastErrorAt = null
    lastError = null
    conflicts = []
    duplicateDetectionCache.clear()
  },
}

function getSyncStateInfo(): SyncStateInfo {
  return syncStateMachine.getSyncStateInfo()
}
