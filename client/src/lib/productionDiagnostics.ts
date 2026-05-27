import { getDB } from './db'
import { performanceTelemetry } from './performanceTelemetry'
import { interactionTracker } from './interactionTracker'
import { createLogger } from './structuredLogger'

const logger = createLogger('Diag')

export interface DiagnosticSnapshot {
  timestamp: number
  performance: Record<string, { avg: number; p50: number; p95: number; p99: number; count: number }>
  interactions: Record<string, number>
  memory: { usedMB: number; totalMB: number; percent: number } | null
  queue: { pending: number; processing: number; dead: number; delivered: number }
  errors: { count: number; recent: string[] }
  recovery: { count: number; lastSuccess: number | null }
}

const MAX_SNAPSHOTS = 50
const snapshots: DiagnosticSnapshot[] = []
const errorSamples: string[] = []
const MAX_ERROR_SAMPLES = 50
let recoveryCount = 0
let lastRecoverySuccess: number | null = null

function sanitizeError(msg: string): string {
  return msg.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
    .replace(/https?:\/\/[^\s]+/g, '[URL]')
    .slice(0, 200)
}

export const productionDiagnostics = {
  recordError(error: unknown): void {
    const msg = error instanceof Error ? error.message : String(error)
    const safe = sanitizeError(msg)
    errorSamples.push(safe)
    if (errorSamples.length > MAX_ERROR_SAMPLES) errorSamples.shift()
  },

  recordRecovery(success: boolean): void {
    recoveryCount++
    if (success) lastRecoverySuccess = Date.now()
  },

  async captureSnapshot(): Promise<DiagnosticSnapshot> {
    const perfMetrics = performanceTelemetry.getAllMetrics()
    const interactionCounts = interactionTracker.getCounts()

    const mem = (performance as any).memory
    const memory = mem ? {
      usedMB: Math.round(mem.usedJSHeapSize / 1048576),
      totalMB: Math.round(mem.totalJSHeapSize / 1048576),
      percent: Math.round((mem.usedJSHeapSize / mem.totalJSHeapSize) * 100),
    } : null

    let queue = { pending: 0, processing: 0, dead: 0, delivered: 0 }
    try {
      const db = await getDB()
      const allItems = await db.getAll('queueItems')
      queue = {
        pending: allItems.filter(i => i.status === 'pending').length,
        processing: allItems.filter(i => i.status === 'processing').length,
        dead: allItems.filter(i => i.status === 'dead').length,
        delivered: allItems.filter(i => i.status === 'delivered' || i.status === 'done').length,
      }
    } catch { /* ignore */ }

    const snapshot: DiagnosticSnapshot = {
      timestamp: Date.now(),
      performance: perfMetrics,
      interactions: interactionCounts as unknown as Record<string, number>,
      memory,
      queue,
      errors: {
        count: errorSamples.length,
        recent: errorSamples.slice(-10),
      },
      recovery: {
        count: recoveryCount,
        lastSuccess: lastRecoverySuccess,
      },
    }

    snapshots.push(snapshot)
    if (snapshots.length > MAX_SNAPSHOTS) snapshots.shift()

    return snapshot
  },

  getSnapshots(): DiagnosticSnapshot[] {
    return [...snapshots]
  },

  getLatestSnapshot(): DiagnosticSnapshot | null {
    return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null
  },

  async generateReport(): Promise<string> {
    const latest = await this.captureSnapshot()
    const lines: string[] = [
      '=== POS Diagnostic Report ===',
      `Timestamp: ${new Date(latest.timestamp).toISOString()}`,
      '',
      '-- Memory --',
      latest.memory ? `  Used: ${latest.memory.usedMB}MB / ${latest.memory.totalMB}MB (${latest.memory.percent}%)` : '  (unavailable)',
      '',
      '-- Queue --',
      `  Pending: ${latest.queue.pending}`,
      `  Processing: ${latest.queue.processing}`,
      `  Dead: ${latest.queue.dead}`,
      `  Delivered: ${latest.queue.delivered}`,
      '',
      '-- Performance --',
    ]

    for (const [name, data] of Object.entries(latest.performance)) {
      lines.push(`  ${name}: avg=${data.avg.toFixed(1)}ms p50=${data.p50}ms p95=${data.p95}ms p99=${data.p99}ms count=${data.count}`)
    }

    lines.push('', '-- Interactions --')
    for (const [name, count] of Object.entries(latest.interactions)) {
      if (count > 0) lines.push(`  ${name}: ${count}`)
    }

    lines.push('', '-- Errors --')
    lines.push(`  Total error samples: ${latest.errors.count}`)
    for (const err of latest.errors.recent) {
      lines.push(`  - ${err}`)
    }

    lines.push('', '-- Recovery --')
    lines.push(`  Total recoveries: ${latest.recovery.count}`)
    lines.push(`  Last success: ${latest.recovery.lastSuccess ? new Date(latest.recovery.lastSuccess).toISOString() : 'never'}`)

    return lines.join('\n')
  },

  async flushToDB(): Promise<void> {
    try {
      const db = await getDB()
      for (const snap of snapshots) {
        await db.put('metrics', {
          id: `diag-${snap.timestamp}`,
          name: 'diagnostic_snapshot',
          value: 1,
          labels: { timestamp: String(snap.timestamp) },
          data: JSON.stringify(snap),
          timestamp: snap.timestamp,
        })
      }
    } catch { /* silent */ }
  },
}
