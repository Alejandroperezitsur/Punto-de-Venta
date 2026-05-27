import { getDB, type QueueItem } from './db'
import { createLogger } from './structuredLogger'

const logger = createLogger('DataConsistency')

export interface ConsistencyCheck {
  type: string
  status: 'pass' | 'fail' | 'warn'
  message: string
  details?: unknown
}

export interface ConsistencyReport {
  checks: ConsistencyCheck[]
  overall: 'pass' | 'fail' | 'warn'
  timestamp: number
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

export const dataConsistency = {
  async computeStateChecksum(): Promise<string> {
    try {
      const db = await getDB()
      const items = await db.getAll('queueItems')
      const checkpoints = await db.getAll('queueCheckpoints')
      const state = {
        items: items.map(i => ({ id: i.id, status: i.status, idempotencyKey: i.idempotencyKey })),
        checkpoints: checkpoints.sort((a, b) => a.createdAt - b.createdAt),
      }
      return await sha256(JSON.stringify(state))
    } catch {
      return 'error'
    }
  },

  async detectStaleTransactions(hours = 24): Promise<QueueItem[]> {
    const cutoff = Date.now() - hours * 3600000
    try {
      const db = await getDB()
      const allItems = await db.getAll('queueItems')
      return allItems.filter(i =>
        (i.status === 'pending' || i.status === 'processing') &&
        i.createdAt < cutoff,
      )
    } catch {
      return []
    }
  },

  async detectDuplicateSyncs(): Promise<Array<{ idempotencyKey: string; count: number; items: string[] }>> {
    try {
      const db = await getDB()
      const syncLogs = await db.getAll('syncLog')
      const keyMap = new Map<string, { count: number; items: string[] }>()

      for (const log of syncLogs) {
        const key = log.idempotencyKey
        if (!keyMap.has(key)) keyMap.set(key, { count: 0, items: [] })
        const entry = keyMap.get(key)!
        entry.count++
        entry.items.push(log.id)
      }

      const duplicates: Array<{ idempotencyKey: string; count: number; items: string[] }> = []
      for (const [key, entry] of keyMap) {
        if (entry.count > 1) {
          duplicates.push({ idempotencyKey: key, ...entry })
        }
      }
      return duplicates
    } catch {
      return []
    }
  },

  async detectInvalidState(): Promise<string[]> {
    const issues: string[] = []
    try {
      const db = await getDB()
      const allItems = await db.getAll('queueItems')

      for (const item of allItems) {
        if (!['pending', 'processing', 'done', 'delivered', 'dead'].includes(item.status)) {
          issues.push(`Item ${item.id} has invalid status: ${item.status}`)
        }
        if (item.attempts < 0) {
          issues.push(`Item ${item.id} has negative attempts: ${item.attempts}`)
        }
        if (item.maxAttempts <= 0) {
          issues.push(`Item ${item.id} has invalid maxAttempts: ${item.maxAttempts}`)
        }
      }

      const orphanCount = allItems.filter(i => i.status === 'processing' && i.updatedAt < Date.now() - 300000).length
      if (orphanCount > 0) {
        issues.push(`${orphanCount} orphan processing items (stuck >5min)`)
      }
    } catch (e) {
      issues.push(`State validation error: ${e instanceof Error ? e.message : 'unknown'}`)
    }
    return issues
  },

  async repairInvalidState(): Promise<number> {
    let repaired = 0
    try {
      const db = await getDB()
      const allItems = await db.getAll('queueItems')
      const now = Date.now()

      for (const item of allItems) {
        let modified = false
        if (item.status === 'processing' && item.updatedAt < now - 300000) {
          item.status = 'pending'
          item.lastError = 'Repaired by consistency check'
          item.updatedAt = now
          modified = true
        }
        if (item.attempts < 0) {
          item.attempts = 0
          modified = true
        }
        if (item.maxAttempts <= 0) {
          item.maxAttempts = 5
          modified = true
        }
        if (modified) {
          await db.put('queueItems', item)
          repaired++
        }
      }
    } catch (e) {
      logger.error('State repair failed', e)
    }
    return repaired
  },

  async runFullCheck(): Promise<ConsistencyReport> {
    const checks: ConsistencyCheck[] = []
    const now = Date.now()

    checkLoop: {
      const stale = await this.detectStaleTransactions(24)
      checks.push({
        type: 'stale_transactions',
        status: stale.length === 0 ? 'pass' : stale.length > 10 ? 'fail' : 'warn',
        message: `${stale.length} stale transactions >24h old`,
        details: stale.map(s => s.id),
      })
    }

    checkLoop: {
      const duplicates = await this.detectDuplicateSyncs()
      checks.push({
        type: 'duplicate_syncs',
        status: duplicates.length === 0 ? 'pass' : duplicates.length > 5 ? 'fail' : 'warn',
        message: `${duplicates.length} duplicate idempotency keys found`,
        details: duplicates,
      })
    }

    checkLoop: {
      const issues = await this.detectInvalidState()
      checks.push({
        type: 'invalid_state',
        status: issues.length === 0 ? 'pass' : issues.length > 5 ? 'fail' : 'warn',
        message: issues.length > 0 ? issues.join('; ') : 'No invalid state',
        details: issues,
      })
    }

    checkLoop: {
      const checksum = await this.computeStateChecksum()
      checks.push({
        type: 'checksum',
        status: 'pass',
        message: `State checksum: ${checksum.slice(0, 16)}...`,
      })
    }

    const failCount = checks.filter(c => c.status === 'fail').length
    const warnCount = checks.filter(c => c.status === 'warn').length
    const overall = failCount > 0 ? 'fail' : warnCount > 0 ? 'warn' : 'pass'

    const report: ConsistencyReport = { checks, overall, timestamp: now }

    try {
      const db = await getDB()
      await db.put('integrityChecks', {
        id: `consistency-${now}`,
        checkId: `consistency-${now}`,
        status: overall,
        details: JSON.stringify(checks),
        checkedAt: now,
      })
    } catch { /* silent */ }

    logger.info(`Consistency check: ${overall} (${checks.length} checks, ${failCount} failures)`)
    return report
  },
}
