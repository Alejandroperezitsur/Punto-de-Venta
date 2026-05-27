import { getDB } from './db'
import { createLogger } from './structuredLogger'
import { interactionTracker } from './interactionTracker'

const logger = createLogger('TxSafety')

export interface SaleProtection {
  idempotencyKey: string
  checkoutId: string
  createdAt: number
  completedAt: number | null
  status: 'pending' | 'completed' | 'failed' | 'rolled_back'
  total: number
  itemCount: number
}

const RECENT_WINDOW = 5000
const MAX_RETENTION = 1000
const pendingSales = new Map<string, SaleProtection>()
const completedKeys = new Set<string>()

let lastTotalMap = new Map<string, number>()

function uid(): string {
  return crypto.randomUUID?.() || 'tx-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
}

export const transactionSafety = {
  beginSale(checkoutId: string, total: number, itemCount: number): { idempotencyKey: string } {
    const idempotencyKey = uid()
    const protection: SaleProtection = {
      idempotencyKey,
      checkoutId,
      createdAt: Date.now(),
      completedAt: null,
      status: 'pending',
      total,
      itemCount,
    }
    pendingSales.set(idempotencyKey, protection)
    if (pendingSales.size > MAX_RETENTION) {
      const oldest = pendingSales.keys().next().value
      if (oldest) pendingSales.delete(oldest)
    }
    return { idempotencyKey }
  },

  async completeSale(idempotencyKey: string): Promise<boolean> {
    const sale = pendingSales.get(idempotencyKey)
    if (!sale) return false
    if (sale.status === 'completed') return false
    sale.status = 'completed'
    sale.completedAt = Date.now()
    completedKeys.add(idempotencyKey)
    pendingSales.delete(idempotencyKey)

    try {
      const db = await getDB()
      await db.put('syncLog', {
        id: uid(),
        idempotencyKey,
        checkoutId: sale.checkoutId,
        status: 'completed',
        total: sale.total,
        timestamp: Date.now(),
      })
    } catch { /* silent */ }

    return true
  },

  async failSale(idempotencyKey: string, error: string): Promise<void> {
    const sale = pendingSales.get(idempotencyKey)
    if (!sale) return
    sale.status = 'failed'
    interactionTracker.trackFailedAction('sale', error)
    try {
      const db = await getDB()
      await db.put('syncLog', {
        id: uid(),
        idempotencyKey,
        checkoutId: sale.checkoutId,
        status: 'failed',
        error,
        total: sale.total,
        timestamp: Date.now(),
      })
    } catch { /* silent */ }
  },

  isDuplicate(checkoutId: string, total: number, windowMs = RECENT_WINDOW): boolean {
    const now = Date.now()
    for (const [, sale] of pendingSales) {
      if (sale.checkoutId === checkoutId &&
        Math.abs(sale.total - total) < 0.01 &&
        now - sale.createdAt < windowMs) {
        return true
      }
    }
    return false
  },

  isIdempotencyKeyUsed(key: string): boolean {
    return completedKeys.has(key) || pendingSales.has(key)
  },

  async validateDuplicateSale(items: Array<{ id: string; quantity: number }>, total: number): Promise<{
    isDuplicate: boolean
    confidence: 'low' | 'medium' | 'high'
    reason: string | null
  }> {
    try {
      const db = await getDB()
      const recentSales = await db.getAll('sales')
      const sorted = recentSales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const recent = sorted.slice(0, 10)

      for (const sale of recent) {
        const saleTotal = sale.total ?? sale.items?.reduce((s: number, i: any) => s + i.price * (i.quantity || 1), 0) ?? 0
        if (Math.abs(saleTotal - total) > 1) continue

        const saleItems = (sale.items || []) as Array<{ id: string; quantity: number }>
        if (saleItems.length !== items.length) continue

        const matchCount = items.filter(item =>
          saleItems.some(si => si.id === item.id && si.quantity === item.quantity),
        ).length

        if (matchCount === items.length) {
          return { isDuplicate: true, confidence: 'high', reason: 'Same items, quantities, and total' }
        }
        if (matchCount >= items.length * 0.8) {
          return { isDuplicate: true, confidence: 'medium', reason: `Similar items (${matchCount}/${items.length} match)` }
        }
      }
      return { isDuplicate: false, confidence: 'low', reason: null }
    } catch {
      return { isDuplicate: false, confidence: 'low', reason: null }
    }
  },

  async validatePartialSync(): Promise<{
    hasCorruption: boolean
    corruptedIds: string[]
    recoveryActions: string[]
  }> {
    const result = { hasCorruption: false, corruptedIds: [] as string[], recoveryActions: [] as string[] }
    try {
      const db = await getDB()
      const allItems = await db.getAll('queueItems')
      const syncLogs = await db.getAll('syncLog')

      const syncByKey = new Map<string, Set<string>>()
      for (const log of syncLogs) {
        const key = log.idempotencyKey
        if (!syncByKey.has(key)) syncByKey.set(key, new Set())
        syncByKey.get(key)!.add(log.status)
      }

      for (const item of allItems) {
        if (item.status === 'delivered' || item.status === 'done') {
          const statuses = syncByKey.get(item.idempotencyKey)
          if (!statuses || !statuses.has('completed')) {
            result.hasCorruption = true
            result.corruptedIds.push(item.id)
            result.recoveryActions.push(`Item ${item.id} marked delivered but no completion record`)
          }
        }
      }
    } catch { /* silent */ }
    return result
  },

  async rollbackOptimisticSale(checkoutId: string): Promise<boolean> {
    interactionTracker.trackFailedAction('sale_rollback', checkoutId)
    try {
      const db = await getDB()
      const allSales = await db.getAll('offlineSales')
      const target = allSales.find(s => s.id === checkoutId || s.idempotency_key === checkoutId)

      if (target && !target.synced) {
        const removed = await db.delete('offlineSales', target.id)
        logger.info(`Rolled back optimistic sale ${checkoutId}`)
        return true
      }
      return false
    } catch (e) {
      logger.error('Rollback failed', e)
      return false
    }
  },

  clearOld(olderThan = 86400000): void {
    const cutoff = Date.now() - olderThan
    for (const [key, sale] of pendingSales) {
      if (sale.createdAt <= cutoff) pendingSales.delete(key)
    }
  },
}
