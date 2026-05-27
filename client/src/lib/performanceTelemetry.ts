type TelemetryMark = {
  name: string
  startTime: number
  duration: number
  metadata?: Record<string, unknown>
}

type TelemetryListener = (mark: TelemetryMark) => void

const MAX_MARKS = 500
const marks: TelemetryMark[] = []
const listeners = new Set<TelemetryListener>()
const activeTimers = new Map<string, number>()

let enabled = true

export const performanceTelemetry = {
  enable() { enabled = true },
  disable() { enabled = false },

  start(name: string): void {
    if (!enabled) return
    activeTimers.set(name, performance.now())
  },

  end(name: string, metadata?: Record<string, unknown>): number {
    if (!enabled) return 0
    const start = activeTimers.get(name)
    if (start === undefined) return 0
    const duration = performance.now() - start
    activeTimers.delete(name)
    this.record(name, duration, metadata)
    return duration
  },

  record(name: string, duration: number, metadata?: Record<string, unknown>): void {
    if (!enabled) return
    const mark: TelemetryMark = {
      name,
      startTime: performance.now() - duration,
      duration,
      metadata,
    }
    marks.push(mark)
    if (marks.length > MAX_MARKS) marks.shift()
    for (const listener of listeners) {
      try { listener(mark) } catch { /* ignore */ }
    }
  },

  getMarks(): TelemetryMark[] {
    return [...marks]
  },

  getMarksByName(name: string): TelemetryMark[] {
    return marks.filter(m => m.name === name)
  },

  getAverage(name: string): number {
    const filtered = marks.filter(m => m.name === name)
    if (filtered.length === 0) return 0
    return filtered.reduce((sum, m) => sum + m.duration, 0) / filtered.length
  },

  getPercentile(name: string, p: number): number {
    const filtered = marks.filter(m => m.name === name).map(m => m.duration).sort((a, b) => a - b)
    if (filtered.length === 0) return 0
    const idx = Math.ceil((p / 100) * filtered.length) - 1
    return filtered[Math.max(0, idx)]
  },

  getCount(name: string): number {
    return marks.filter(m => m.name === name).length
  },

  getRecent(name: string, windowMs = 60000): TelemetryMark[] {
    const cutoff = performance.now() - windowMs
    return marks.filter(m => m.name === name && m.startTime > cutoff)
  },

  getRecentRate(name: string, windowMs = 60000): number {
    const recent = this.getRecent(name, windowMs)
    return (recent.length / windowMs) * 60000
  },

  getAllMetrics(): Record<string, { avg: number; p50: number; p95: number; p99: number; count: number }> {
    const names = new Set(marks.map(m => m.name))
    const result: Record<string, any> = {}
    for (const name of names) {
      const vals = marks.filter(m => m.name === name).map(m => m.duration).sort((a, b) => a - b)
      if (vals.length === 0) continue
      result[name] = {
        avg: vals.reduce((a, b) => a + b, 0) / vals.length,
        p50: vals[Math.floor(vals.length * 0.5)],
        p95: vals[Math.floor(vals.length * 0.95)],
        p99: vals[Math.floor(vals.length * 0.99)],
        count: vals.length,
      }
    }
    return result
  },

  clear(): void {
    marks.length = 0
    activeTimers.clear()
  },

  subscribe(listener: TelemetryListener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export type { TelemetryMark, TelemetryListener }
