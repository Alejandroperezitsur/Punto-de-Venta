import { getDB } from './db'
import { createLogger } from './structuredLogger'
import { performanceTelemetry } from './performanceTelemetry'
import { interactionTracker } from './interactionTracker'

const logger = createLogger('OfflineRecovery')

export interface RecoveryAction {
  id: string
  type: 'state_repair' | 'queue_reset' | 'cache_clear' | 'migration_retry' | 'checksum_fix'
  description: string
  automatic: boolean
  executed: boolean
  result: 'success' | 'failed' | 'skipped'
  error?: string
}

export interface RecoveryReport {
  recovered: boolean
  actions: RecoveryAction[]
  corruptedStores: string[]
  staleEntries: number
  errors: string[]
}

function uid(): string {
  return crypto.randomUUID?.() || 'rec-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
}

async function sha256(data: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return 'checksum-unavailable'
  }
}

export const offlineRecoveryEngine = {
  async runRecovery(): Promise<RecoveryReport> {
    const actions: RecoveryAction[] = []
    const corruptedStores: string[] = []
    const errors: string[] = []

    performanceTelemetry.start('recovery.full')
    logger.info('Starting full offline recovery')

    try {
      const result1 = await this.detectCorruptedState()
      corruptedStores.push(...result1.corrupted)
      actions.push(...result1.actions)
    } catch (e) {
      errors.push(`Corruption detection: ${e instanceof Error ? e.message : 'unknown'}`)
    }

    try {
      const result2 = await this.repairStaleQueues()
      actions.push(...result2)
    } catch (e) {
      errors.push(`Queue repair: ${e instanceof Error ? e.message : 'unknown'}`)
    }

    try {
      const result3 = await this.validateAndRepairDB()
      actions.push(...result3)
    } catch (e) {
      errors.push(`DB validation: ${e instanceof Error ? e.message : 'unknown'}`)
    }

    try {
      const result4 = await this.cleanPartialCacheInvalidation()
      actions.push(...result4)
    } catch (e) {
      errors.push(`Cache cleanup: ${e instanceof Error ? e.message : 'unknown'}`)
    }

    const duration = performanceTelemetry.end('recovery.full')
    const recovered = actions.filter(a => a.executed && a.result === 'success').length > 0

    logger.info(`Recovery completed: ${actions.length} actions, ${recovered ? 'recovered' : 'no issues'}, ${duration}ms`)

    return { recovered, actions, corruptedStores, staleEntries: actions.filter(a => a.type === 'cache_clear').length, errors }
  },

  async detectCorruptedState(): Promise<{
    corrupted: string[]
    actions: RecoveryAction[]
  }> {
    const corrupted: string[] = []
    const actions: RecoveryAction[] = []

    try {
      const db = await getDB()
      const storeNames = Array.from(db.objectStoreNames)

      for (const storeName of storeNames) {
        try {
          await db.count(storeName)
        } catch {
          corrupted.push(storeName)
          const action: RecoveryAction = {
            id: uid(),
            type: 'state_repair',
            description: `Store '${storeName}' is corrupted or inaccessible`,
            automatic: true,
            executed: false,
            result: 'skipped',
          }

          try {
            if (storeName === 'queueItems' || storeName === 'deadLetters') {
              await db.clear(storeName)
              action.executed = true
              action.result = 'success'
              action.description = `Cleared corrupted store '${storeName}'`
              logger.warn(`Cleared corrupted store: ${storeName}`)
            }
          } catch {
            action.result = 'failed'
            action.error = `Could not clear store ${storeName}`
          }
          actions.push(action)
        }
      }

      if (corrupted.length > 0) {
        interactionTracker.trackFailedAction('corrupted_state', corrupted.join(', '))
      }
    } catch (e) {
      const action: RecoveryAction = {
        id: uid(),
        type: 'state_repair',
        description: 'IndexedDB completely inaccessible, attempting reopen',
        automatic: true,
        executed: true,
        result: 'success',
      }
      try {
        const freshDB = await getDB()
        if (freshDB) {
          action.result = 'success'
          action.description = 'IndexedDB reopened successfully'
        }
      } catch {
        action.result = 'failed'
        action.error = 'Could not reopen IndexedDB'
      }
      actions.push(action)
    }

    return { corrupted, actions }
  },

  async repairStaleQueues(): Promise<RecoveryAction[]> {
    const actions: RecoveryAction[] = []
    try {
      const db = await getDB()
      const allItems = await db.getAll('queueItems')
      const now = Date.now()
      let repaired = 0

      for (const item of allItems) {
        if (item.status === 'processing' && item.updatedAt < now - 300000) {
          item.status = 'pending'
          item.lastError = 'Recovered by offline recovery engine'
          item.updatedAt = now
          await db.put('queueItems', item)
          repaired++
        }
        if (item.nextRetryAt && item.nextRetryAt < now - 86400000 && item.status === 'pending') {
          item.nextRetryAt = now + 2000
          await db.put('queueItems', item)
          repaired++
        }
      }

      actions.push({
        id: uid(),
        type: 'queue_reset',
        description: `Repaired ${repaired} stale queue items`,
        automatic: true,
        executed: repaired > 0,
        result: 'success',
      })
    } catch (e) {
      actions.push({
        id: uid(),
        type: 'queue_reset',
        description: 'Failed to repair stale queues',
        automatic: true,
        executed: true,
        result: 'failed',
        error: e instanceof Error ? e.message : 'unknown',
      })
    }
    return actions
  },

  async validateAndRepairDB(): Promise<RecoveryAction[]> {
    const actions: RecoveryAction[] = []
    try {
      const db = await getDB()

      const action: RecoveryAction = {
        id: uid(),
        type: 'migration_retry',
        description: 'Database version OK, stores accessible',
        automatic: true,
        executed: true,
        result: 'success',
      }

      const storeCount = Array.from(db.objectStoreNames).length
      if (storeCount < 20) {
        action.result = 'failed'
        action.description = `Missing stores: expected ~27, found ${storeCount}`
      }

      actions.push(action)
    } catch (e) {
      actions.push({
        id: uid(),
        type: 'migration_retry',
        description: 'Database validation failed',
        automatic: true,
        executed: true,
        result: 'failed',
        error: e instanceof Error ? e.message : 'unknown',
      })
    }
    return actions
  },

  async cleanPartialCacheInvalidation(): Promise<RecoveryAction[]> {
    const actions: RecoveryAction[] = []
    try {
      const db = await getDB()
      const cacheEntries = await db.getAll('apiCache')
      const now = Date.now()
      const MAX_CACHE_AGE = 7 * 86400000
      let removed = 0

      for (const entry of cacheEntries) {
        if (now - entry.updatedAt > MAX_CACHE_AGE) {
          await db.delete('apiCache', entry.request as any)
          removed++
        }
      }

      const metrics = await db.getAll('metrics')
      const MAX_METRICS_AGE = 86400000
      let metricsRemoved = 0
      for (const m of metrics) {
        if (now - m.timestamp > MAX_METRICS_AGE) {
          await db.delete('metrics', m.id)
          metricsRemoved++
        }
      }

      actions.push({
        id: uid(),
        type: 'cache_clear',
        description: `Removed ${removed} stale cache entries, ${metricsRemoved} old metrics`,
        automatic: true,
        executed: removed > 0 || metricsRemoved > 0,
        result: 'success',
      })
    } catch (e) {
      actions.push({
        id: uid(),
        type: 'cache_clear',
        description: 'Failed to clean caches',
        automatic: true,
        executed: true,
        result: 'failed',
        error: e instanceof Error ? e.message : 'unknown',
      })
    }
    return actions
  },

  async computeChecksum(): Promise<string> {
    try {
      const db = await getDB()
      const items = await db.getAll('queueItems')
      const serialized = items.map(i => `${i.id}:${i.status}:${i.attempts}`).join('|')
      return await sha256(serialized)
    } catch {
      return 'error'
    }
  },

  async verifyDataIntegrity(): Promise<{
    valid: boolean
    issues: string[]
  }> {
    const issues: string[] = []
    try {
      const db = await getDB()
      const allItems = await db.getAll('queueItems')

      const idempotencyKeys = new Map<string, string[]>()
      for (const item of allItems) {
        const existing = idempotencyKeys.get(item.idempotencyKey) || []
        existing.push(item.id)
        idempotencyKeys.set(item.idempotencyKey, existing)
      }

      for (const [key, ids] of idempotencyKeys) {
        if (ids.length > 1) {
          issues.push(`Duplicate idempotency key ${key}: ${ids.join(', ')}`)
        }
      }

      const deadItems = allItems.filter(i => i.status === 'dead')
      if (deadItems.length > 50) {
        issues.push(`High dead letter count: ${deadItems.length}`)
      }

      const processingStuck = allItems.filter(i =>
        i.status === 'processing' && i.updatedAt < Date.now() - 300000,
      )
      if (processingStuck.length > 0) {
        issues.push(`${processingStuck.length} processing items stuck >5min`)
      }

      return { valid: issues.length === 0, issues }
    } catch (e) {
      return {
        valid: false,
        issues: [`Integrity check error: ${e instanceof Error ? e.message : 'unknown'}`],
      }
    }
  },
}
