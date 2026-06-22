import { getDB } from './db'
import { createLogger, getLogHistory } from './structuredLogger'
import { metrics } from './metricsCollector'

const logger = createLogger('Forensics')

export type ForensicEventType =
  | 'critical_error'
  | 'scan'
  | 'sync'
  | 'sync_error'
  | 'recovery'
  | 'reconnect'
  | 'focus_restore'
  | 'degraded_mode'
  | 'emergency_mode'
  | 'storage_failure'
  | 'corruption_detected'
  | 'circuit_breaker'
  | 'quota_exceeded'
  | 'crash'

export interface ForensicEvent {
  id: string
  type: ForensicEventType
  timestamp: number
  data: Record<string, unknown>
  correlationId: string
}

export interface IncidentSnapshot {
  id: string
  timestamp: number
  appState: {
    route: string
    connectivity: 'online' | 'offline' | 'degraded'
    degradedMode: 'normal' | 'degraded' | 'emergency' | 'recovery'
    memory: { usedMB: number; totalMB: number; percent: number } | null
    uptime: number
  }
  queueState: {
    pending: number
    processing: number
    dead: number
    delivered: number
    deadLetterCount: number
  }
  pendingSales: number
  syncState: string
  recentRecoveries: ForensicEvent[]
  recentErrors: ForensicEvent[]
  circuitBreakers: Record<string, string>
  storageHealth: { ok: boolean; quotaUsage: number; storeCounts: Record<string, number> }
}

export interface ForensicReport {
  id: string
  incidentId: string
  generatedAt: number
  summary: string
  timeline: TimelineEntry[]
  snapshots: IncidentSnapshot[]
  diagnostics: Record<string, unknown>
  errors: string[]
  warnings: string[]
  recoveryActions: string[]
  duration: number
  survivabilityScore: number
}

export interface TimelineEntry {
  timestamp: number
  type: string
  description: string
  severity: 'critical' | 'warning' | 'info'
  recovered: boolean
}

const BUFFER_SIZE = 200
const MAX_SNAPSHOTS = 30
const MAX_FORENSIC_REPORTS = 10

let appStartTime = Date.now()
let currentRoute = '/'
let degradedMode: 'normal' | 'degraded' | 'emergency' | 'recovery' = 'normal'
let connectivityState: 'online' | 'offline' | 'degraded' = 'online'

function uid(): string {
  return crypto.randomUUID?.() || 'forensic-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
}

class DiagnosticBuffer {
  private events: ForensicEvent[] = []

  push(event: ForensicEvent): void {
    this.events.push(event)
    if (this.events.length > BUFFER_SIZE) this.events.shift()
  }

  getAll(): ForensicEvent[] {
    return [...this.events]
  }

  getByType(type: ForensicEventType, limit = 20): ForensicEvent[] {
    return this.events.filter(e => e.type === type).slice(-limit)
  }

  getRecent(limit = 30): ForensicEvent[] {
    return this.events.slice(-limit)
  }

  getRecentByTypes(types: ForensicEventType[], limit = 50): ForensicEvent[] {
    return this.events.filter(e => types.includes(e.type)).slice(-limit)
  }

  clear(): void {
    this.events = []
  }

  get size(): number {
    return this.events.length
  }
}

const eventBuffer = new DiagnosticBuffer()

function sanitizeForExport(data: Record<string, unknown>): Record<string, unknown> {
  const sensitive = ['token', 'password', 'secret', 'authorization', 'jwt', 'key', 'credential', 'hash']
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForExport(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

function getStoredCircuitBreakers(): Record<string, string> {
  try {
    const raw = localStorage.getItem('pos_circuit_breakers')
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export const incidentForensics = {
  recordEvent(type: ForensicEventType, data: Record<string, unknown> = {}): void {
    const event: ForensicEvent = {
      id: uid(),
      type,
      timestamp: Date.now(),
      data,
      correlationId: (window as any).__correlationId || 'unknown',
    }
    eventBuffer.push(event)
    if (type === 'critical_error' || type === 'corruption_detected' || type === 'quota_exceeded' || type === 'crash') {
      this.captureIncidentSnapshot(`auto_${type}`).catch(() => {})
    }
  },

  getRecentEvents(limit = 30): ForensicEvent[] {
    return eventBuffer.getRecent(limit)
  },

  getCriticalEvents(limit = 20): ForensicEvent[] {
    return eventBuffer.getByType('critical_error', limit)
  },

  getRecoveryEvents(limit = 20): ForensicEvent[] {
    return eventBuffer.getByType('recovery', limit)
  },

  getEventsByTypes(types: ForensicEventType[], limit = 50): ForensicEvent[] {
    return eventBuffer.getRecentByTypes(types, limit)
  },

  getAllBufferedEvents(): ForensicEvent[] {
    return eventBuffer.getAll()
  },

  async captureIncidentSnapshot(incidentId: string): Promise<IncidentSnapshot> {
    const mem = (performance as any).memory
    const memory = mem ? {
      usedMB: Math.round(mem.usedJSHeapSize / 1048576),
      totalMB: Math.round(mem.totalJSHeapSize / 1048576),
      percent: Math.round((mem.usedJSHeapSize / mem.totalJSHeapSize) * 100),
    } : null

    let queue = { pending: 0, processing: 0, dead: 0, delivered: 0, deadLetterCount: 0 }
    let storageHealth = { ok: true, quotaUsage: 0, storeCounts: {} as Record<string, number> }
    try {
      const db = await getDB()
      const allItems = await db.getAll('queueItems')
      queue = {
        pending: allItems.filter(i => i.status === 'pending').length,
        processing: allItems.filter(i => i.status === 'processing').length,
        dead: allItems.filter(i => i.status === 'dead').length,
        delivered: allItems.filter(i => i.status === 'delivered' || i.status === 'done').length,
        deadLetterCount: await db.count('deadLetters'),
      }
      const counts: Record<string, number> = {}
      for (const name of Array.from(db.objectStoreNames)) {
        counts[name] = await db.count(name)
      }
      storageHealth = { ok: true, quotaUsage: 0, storeCounts: counts }
    } catch { /* no db */ }

    const recentRecoveries = eventBuffer.getByType('recovery', 5)
    const recentErrors = eventBuffer.getByType('critical_error', 5)

    const snapshot: IncidentSnapshot = {
      id: uid(),
      timestamp: Date.now(),
      appState: {
        route: currentRoute,
        connectivity: connectivityState,
        degradedMode: degradedMode,
        memory,
        uptime: Date.now() - appStartTime,
      },
      queueState: queue,
      pendingSales: 0,
      syncState: 'unknown',
      recentRecoveries,
      recentErrors,
      circuitBreakers: getStoredCircuitBreakers(),
      storageHealth,
    }

    try {
      const db = await getDB()
      await db.put('metrics', {
        id: `incident-snap-${snapshot.timestamp}`,
        name: 'incident_snapshot',
        value: 1,
        labels: { incidentId },
        data: JSON.stringify(sanitizeForExport(snapshot as unknown as Record<string, unknown>)),
        timestamp: snapshot.timestamp,
      })
      const allSnaps = await db.getAll('metrics')
      const incidentSnaps = allSnaps.filter((m: any) => m.name === 'incident_snapshot')
      if (incidentSnaps.length > MAX_SNAPSHOTS) {
        incidentSnaps.sort((a: any, b: any) => a.timestamp - b.timestamp)
        const toRemove = incidentSnaps.slice(0, incidentSnaps.length - MAX_SNAPSHOTS)
        for (const s of toRemove) await db.delete('metrics', s.id)
      }
    } catch { /* silent */ }

    return snapshot
  },

  async reconstructTimeline(incidentId?: string, sinceTimestamp?: number): Promise<TimelineEntry[]> {
    const timeline: TimelineEntry[] = []
    const cutoff = sinceTimestamp || (Date.now() - 86400000)

    const events = eventBuffer.getAll().filter(e => e.timestamp >= cutoff)

    for (const event of events) {
      let severity: 'critical' | 'warning' | 'info' = 'info'
      let recovered = false
      let description: string = event.type

      switch (event.type) {
        case 'critical_error':
        case 'crash':
        case 'corruption_detected':
          severity = 'critical'
          recovered = false
          description = event.data?.error ? `Error: ${event.data.error}` : `Critical: ${event.type}`
          break
        case 'recovery':
          severity = 'info'
          recovered = event.data?.success === true
          description = event.data?.action ? `Recovery: ${event.data.action}` : 'Recovery executed'
          break
        case 'reconnect':
          severity = 'warning'
          recovered = true
          description = `Reconnect after ${event.data?.durationMs || 'unknown'}ms offline`
          break
        case 'degraded_mode':
        case 'emergency_mode':
          severity = 'warning'
          description = `Entered ${event.type.replace('_', ' ')}`
          break
        case 'sync_error':
          severity = 'warning'
          description = event.data?.error ? `Sync error: ${event.data.error}` : 'Sync failed'
          break
        case 'circuit_breaker':
          severity = 'critical'
          description = `Circuit breaker ${event.data?.breaker || 'unknown'} ${event.data?.state || 'opened'}`
          break
        case 'quota_exceeded':
          severity = 'critical'
          description = 'Storage quota exceeded'
          break
        case 'storage_failure':
          severity = 'critical'
          description = event.data?.error ? `Storage failure: ${event.data.error}` : 'Storage failure'
          break
      }

      timeline.push({
        timestamp: event.timestamp,
        type: event.type,
        description,
        severity,
        recovered,
      })
    }

    timeline.sort((a, b) => b.timestamp - a.timestamp)
    return timeline
  },

  async generateForensicReport(incidentId?: string): Promise<ForensicReport> {
    const startTime = performance.now()
    const timeline = await this.reconstructTimeline(incidentId)
    const snapshot = await this.captureIncidentSnapshot(incidentId || uid())
    const criticalCount = timeline.filter(t => t.severity === 'critical').length
    const warningCount = timeline.filter(t => t.severity === 'warning').length
    const recoveryCount = timeline.filter(t => t.type === 'recovery' && t.recovered).length
    const failedRecovery = timeline.filter(t => t.type === 'recovery' && !t.recovered).length

    const summary = criticalCount > 0
      ? `Incident with ${criticalCount} critical events, ${recoveryCount} recoveries, ${failedRecovery} failed recoveries`
      : warningCount > 0
        ? `Degraded operation with ${warningCount} warnings, ${recoveryCount} recoveries`
        : 'No critical events detected'

    const errors = timeline.filter(t => t.severity === 'critical').map(t => t.description)
    const warnings = timeline.filter(t => t.severity === 'warning').map(t => t.description)
    const recoveryActions = timeline.filter(t => t.type === 'recovery').map(t => t.description)

    const survivabilityScore = this.calculateSurvivabilityScore(timeline)

    const report: ForensicReport = {
      id: uid(),
      incidentId: incidentId || 'unknown',
      generatedAt: Date.now(),
      summary,
      timeline,
      snapshots: [snapshot],
      diagnostics: {
        uptime: Date.now() - appStartTime,
        eventCount: eventBuffer.size,
        criticalCount,
        warningCount,
        recoveryCount,
        failedRecovery,
        memory: snapshot.appState.memory,
        queue: snapshot.queueState,
        uptimeHours: ((Date.now() - appStartTime) / 3600000).toFixed(1),
        connectivity: connectivityState,
      },
      errors,
      warnings,
      recoveryActions,
      duration: Math.round(performance.now() - startTime),
      survivabilityScore,
    }

    try {
      const db = await getDB()
      await db.put('metrics', {
        id: `forensic-report-${report.id}`,
        name: 'forensic_report',
        value: 1,
        labels: { incidentId: incidentId || 'unknown', score: String(survivabilityScore) },
        data: JSON.stringify(sanitizeForExport(report as unknown as Record<string, unknown>)),
        timestamp: report.generatedAt,
      })

      const allReports = await db.getAll('metrics')
      const forensicReports = allReports.filter((m: any) => m.name === 'forensic_report')
      if (forensicReports.length > MAX_FORENSIC_REPORTS) {
        forensicReports.sort((a: any, b: any) => a.timestamp - b.timestamp)
        const toRemove = forensicReports.slice(0, forensicReports.length - MAX_FORENSIC_REPORTS)
        for (const r of toRemove) await db.delete('metrics', r.id)
      }
    } catch { /* silent */ }

    return report
  },

  calculateSurvivabilityScore(timeline: TimelineEntry[]): number {
    if (timeline.length === 0) return 100
    let score = 100
    const criticalCount = timeline.filter(t => t.severity === 'critical').length
    const failedRecoveries = timeline.filter(t => t.type === 'recovery' && !t.recovered).length
    const emergencyModes = timeline.filter(t => t.type === 'emergency_mode').length

    score -= criticalCount * 15
    score -= failedRecoveries * 20
    score -= emergencyModes * 10
    score = Math.max(0, Math.min(100, score))
    return score
  },

  async exportForensicPackage(incidentId?: string): Promise<{
    report: ForensicReport
    sanitizedLogs: Record<string, unknown>[]
    metrics: Record<string, unknown>[]
    telemetry: Record<string, unknown>
  }> {
    const report = await this.generateForensicReport(incidentId)

    const rawLogs = getLogHistory()
    const sanitizedLogs = rawLogs.map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      source: log.source,
      message: log.message,
      duration: log.duration,
    }))

    const metricPoints = metrics.getAllMetrics().map(m => ({
      name: m.name,
      value: m.value,
      timestamp: m.timestamp,
    }))

    const telemetry = {
      timeline: report.timeline,
      diagnostics: report.diagnostics,
      snapshots: report.snapshots,
    }

    return { report, sanitizedLogs, metrics: metricPoints, telemetry }
  },

  setCurrentRoute(route: string): void {
    currentRoute = route
  },

  setConnectivity(state: 'online' | 'offline' | 'degraded'): void {
    connectivityState = state
  },

  setDegradedMode(mode: 'normal' | 'degraded' | 'emergency' | 'recovery'): void {
    degradedMode = mode
  },

  getUptime(): number {
    return Date.now() - appStartTime
  },

  resetUptime(): void {
    appStartTime = Date.now()
  },

  getBufferSize(): number {
    return eventBuffer.size
  },

  clearBuffer(): void {
    eventBuffer.clear()
  },
}
