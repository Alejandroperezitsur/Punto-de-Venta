import { performanceTelemetry } from './performanceTelemetry'
import { createLogger } from './structuredLogger'

const logger = createLogger('Budget')

export interface BudgetThreshold {
  name: string
  metric: string
  warnMs: number
  errorMs: number
  maxCount?: number
}

export interface BudgetConfig {
  thresholds: BudgetThreshold[]
  maxMemoryGrowthMB: number
  maxDOMNodes: number
  maxRerenders: number
  maxSyncQueue: number
}

const DEFAULT_CONFIG: BudgetConfig = {
  thresholds: [
    { name: 'checkout', metric: 'checkout.total', warnMs: 1000, errorMs: 1500 },
    { name: 'scan_latency', metric: 'scan.latency', warnMs: 50, errorMs: 100 },
    { name: 'render_duration', metric: 'render.*', warnMs: 16, errorMs: 50 },
    { name: 'modal_open', metric: 'modal.open', warnMs: 100, errorMs: 300 },
    { name: 'search_latency', metric: 'search.latency', warnMs: 200, errorMs: 500 },
    { name: 'route_transition', metric: 'route.transition', warnMs: 120, errorMs: 300 },
    { name: 'sync_duration', metric: 'sync.batch', warnMs: 3000, errorMs: 10000 },
    { name: 'reconnect', metric: 'reconnect.duration', warnMs: 500, errorMs: 2000 },
    { name: 'input_latency', metric: 'input.latency', warnMs: 50, errorMs: 100 },
  ],
  maxMemoryGrowthMB: 50,
  maxDOMNodes: 3000,
  maxRerenders: 100,
  maxSyncQueue: 200,
}

let config: BudgetConfig = DEFAULT_CONFIG
let warningCounts = new Map<string, number>()
let baselineMemory = 0
let listeners: Array<(violation: BudgetViolation) => void> = []

export interface BudgetViolation {
  type: 'warn' | 'error'
  metric: string
  threshold: number
  actual: number
  message: string
  timestamp: number
}

export function configureBudget(overrides: Partial<BudgetConfig>): void {
  config = { ...config, ...overrides }
}

export function checkBudget(metric: string, actual: number): void {
  for (const threshold of config.thresholds) {
    if (!metric.startsWith(threshold.metric.replace('*', ''))) continue
    if (metric.includes('*') && !new RegExp('^' + threshold.metric.replace('*', '.*') + '$').test(metric)) continue

    const level = actual >= threshold.errorMs ? 'error' : actual >= threshold.warnMs ? 'warn' : null
    if (!level) {
      warningCounts.delete(metric)
      return
    }

    const key = `${metric}:${level}`
    const count = warningCounts.get(key) || 0
    if (count > 10) return
    warningCounts.set(key, count + 1)

    const violation: BudgetViolation = {
      type: level,
      metric,
      threshold: level === 'error' ? threshold.errorMs : threshold.warnMs,
      actual,
      message: `[Budget ${level.toUpperCase()}] ${metric}: ${actual.toFixed(1)}ms exceeds ${level === 'error' ? 'error' : 'warn'} threshold (${level === 'error' ? threshold.errorMs : threshold.warnMs}ms)`,
      timestamp: Date.now(),
    }

    for (const listener of listeners) listener(violation)

    if (level === 'error') {
      logger.warn(violation.message)
    } else {
      logger.debug(violation.message)
    }
  }
}

export function subscribeBudgetViolations(listener: (v: BudgetViolation) => void): () => void {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter(l => l !== listener)
  }
}

export function getBudgetViolations(): BudgetViolation[] {
  if (typeof window === 'undefined') return []
  return (window as any).__budgetViolations || []
}

export function getActiveWarnings(): BudgetViolation[] {
  return getBudgetViolations().filter(v => v.type === 'warn')
}

export function initBudgetMonitor(): void {
  baselineMemory = ((performance as any)?.memory?.usedJSHeapSize as number) || 0
  if (!baselineMemory) return

  const domWarning = new Set<string>()

  const checkInterval = setInterval(() => {
    const currentMem = ((performance as any)?.memory?.usedJSHeapSize as number) || 0
    const growthMB = (currentMem - baselineMemory) / 1048576
    if (growthMB > config.maxMemoryGrowthMB) {
      logger.warn(`Memory growth ${growthMB.toFixed(1)}MB exceeds budget (${config.maxMemoryGrowthMB}MB)`)
    }

    const domNodes = document.querySelectorAll('*').length
    if (domNodes > config.maxDOMNodes && !domWarning.has('dom')) {
      domWarning.add('dom')
      logger.warn(`DOM nodes ${domNodes} exceeds budget (${config.maxDOMNodes})`)
    }
  }, 15000)

  const unsubscribe = performanceTelemetry.subscribe((mark) => {
    checkBudget(mark.name, mark.duration)
  })

  setTimeout(() => {
    baselineMemory = ((performance as any)?.memory?.usedJSHeapSize as number) || 0
  }, 10000)

  if (import.meta.env.DEV) {
    subscribeBudgetViolations((v) => {
      if (v.type === 'error') {
        console.warn(`%c[PERF BUDGET] ${v.message}`, 'color: #ff6b6b; font-weight: bold')
      }
    })
  }

  const originalCleanup = () => {
    clearInterval(checkInterval)
    unsubscribe()
  }
  return originalCleanup
}

export async function reportBudgets(): Promise<{
  status: 'ok' | 'warning' | 'critical'
  violations: BudgetViolation[]
  memory: { baseline: number; current: number; growthMB: number }
}> {
  const currentMem = ((performance as any)?.memory?.usedJSHeapSize as number) || 0
  const growthMB = (currentMem - baselineMemory) / 1048576
  const violations = getBudgetViolations()
  const errors = violations.filter(v => v.type === 'error')

  return {
    status: errors.length > 0 ? 'critical' : violations.length > 0 ? 'warning' : 'ok',
    violations,
    memory: { baseline: baselineMemory, current: currentMem, growthMB },
  }
}
