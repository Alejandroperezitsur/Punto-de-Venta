import { createLogger } from './structuredLogger'
import { incidentForensics } from './incidentForensics'
import { degradedModeEngine } from './degradedModeEngine'
import { metrics } from './metricsCollector'
import { getDB } from './db'

const logger = createLogger('Governor')

export type CircuitBreakerName = 'sync' | 'storage' | 'recovery' | 'diagnostics'
export type CircuitBreakerState = 'closed' | 'open' | 'half_open'

export interface CircuitBreaker {
  name: CircuitBreakerName
  state: CircuitBreakerState
  failureCount: number
  failureThreshold: number
  lastFailureAt: number | null
  openedAt: number | null
  halfOpenAt: number | null
  resetTimeoutMs: number
  description: string
}

export interface RecoveryGovernorState {
  retriesThisMinute: number
  retryLimitPerMinute: number
  consecutiveRecoveries: number
  consecutiveRecoveryLimit: number
  repairAttemptsThisHour: number
  repairLimitPerHour: number
  selfHealFrequency: number
  selfHealLimitPerHour: number
  lastRecoveryAt: number | null
  lastRepairAt: number | null
  governorLocked: boolean
  governorLockedUntil: number | null
}

export interface RuntimeSafetyState {
  memoryLimitMB: number
  maxQueueSize: number
  maxRetriesPerItem: number
  maxSnapshotsPerHour: number
  maxTelemetryEventsPerMinute: number
  snapshotCountThisHour: number
  telemetryCountThisMinute: number
  lastSafetyCheck: number
  violations: string[]
}

const STORAGE_KEY_CIRCUIT = 'pos_circuit_breakers'
const STORAGE_KEY_GOVERNOR = 'pos_governor_state'
const MAX_RETRIES_PER_MINUTE = 30
const MAX_CONSECUTIVE_RECOVERIES = 5
const MAX_REPAIRS_PER_HOUR = 10
const MAX_SELF_HEAL_PER_HOUR = 20
const CIRCUIT_RESET_TIMEOUT = 60000
const CIRCUIT_FAILURE_THRESHOLD = 5
const MAX_QUEUE_SIZE = 1000

const circuitBreakers: Record<CircuitBreakerName, CircuitBreaker> = {
  sync: {
    name: 'sync', state: 'closed', failureCount: 0, failureThreshold: CIRCUIT_FAILURE_THRESHOLD,
    lastFailureAt: null, openedAt: null, halfOpenAt: null, resetTimeoutMs: CIRCUIT_RESET_TIMEOUT,
    description: 'Sync engine circuit breaker',
  },
  storage: {
    name: 'storage', state: 'closed', failureCount: 0, failureThreshold: CIRCUIT_FAILURE_THRESHOLD,
    lastFailureAt: null, openedAt: null, halfOpenAt: null, resetTimeoutMs: CIRCUIT_RESET_TIMEOUT,
    description: 'Storage circuit breaker',
  },
  recovery: {
    name: 'recovery', state: 'closed', failureCount: 0, failureThreshold: 3,
    lastFailureAt: null, openedAt: null, halfOpenAt: null, resetTimeoutMs: CIRCUIT_RESET_TIMEOUT * 2,
    description: 'Recovery engine circuit breaker',
  },
  diagnostics: {
    name: 'diagnostics', state: 'closed', failureCount: 0, failureThreshold: CIRCUIT_FAILURE_THRESHOLD,
    lastFailureAt: null, openedAt: null, halfOpenAt: null, resetTimeoutMs: CIRCUIT_RESET_TIMEOUT,
    description: 'Diagnostics circuit breaker',
  },
}

const governor: RecoveryGovernorState = {
  retriesThisMinute: 0, retryLimitPerMinute: MAX_RETRIES_PER_MINUTE,
  consecutiveRecoveries: 0, consecutiveRecoveryLimit: MAX_CONSECUTIVE_RECOVERIES,
  repairAttemptsThisHour: 0, repairLimitPerHour: MAX_REPAIRS_PER_HOUR,
  selfHealFrequency: 0, selfHealLimitPerHour: MAX_SELF_HEAL_PER_HOUR,
  lastRecoveryAt: null, lastRepairAt: null,
  governorLocked: false, governorLockedUntil: null,
}

const safety: RuntimeSafetyState = {
  memoryLimitMB: 500, maxQueueSize: MAX_QUEUE_SIZE, maxRetriesPerItem: 10,
  maxSnapshotsPerHour: 12, maxTelemetryEventsPerMinute: 60,
  snapshotCountThisHour: 0, telemetryCountThisMinute: 0,
  lastSafetyCheck: Date.now(), violations: [],
}

let retryResetInterval: ReturnType<typeof setInterval> | null = null
let hourResetInterval: ReturnType<typeof setInterval> | null = null
let safetyCheckInterval: ReturnType<typeof setInterval> | null = null
let evaluationTimer: ReturnType<typeof setInterval> | null = null
let escalationLevel = 0

function persistCircuitBreakers(): void {
  try {
    const data: Record<string, { state: CircuitBreakerState; failureCount: number }> = {}
    for (const [name, cb] of Object.entries(circuitBreakers)) {
      data[name] = { state: cb.state, failureCount: cb.failureCount }
    }
    localStorage.setItem(STORAGE_KEY_CIRCUIT, JSON.stringify(data))
  } catch { /* noop */ }
}

function loadCircuitBreakers(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CIRCUIT)
    if (raw) {
      const data = JSON.parse(raw)
      for (const [name, state] of Object.entries(data)) {
        if (circuitBreakers[name as CircuitBreakerName]) {
          circuitBreakers[name as CircuitBreakerName].state = (state as any).state
          circuitBreakers[name as CircuitBreakerName].failureCount = (state as any).failureCount
        }
      }
    }
  } catch { /* noop */ }
}

export const productionGovernor = {
  init(): void {
    loadCircuitBreakers()

    retryResetInterval = setInterval(() => {
      governor.retriesThisMinute = 0
      governor.telemetryCountThisMinute = 0
    }, 60000)

    hourResetInterval = setInterval(() => {
      governor.repairAttemptsThisHour = 0
      governor.selfHealFrequency = 0
      safety.snapshotCountThisHour = 0
      escalationLevel = 0
    }, 3600000)

    safetyCheckInterval = setInterval(() => this.runSafetyCheck(), 60000)
    evaluationTimer = setInterval(() => this.evaluateCircuitBreakers(), 30000)

    logger.info('Production governor initialized')
  },

  destroy(): void {
    if (retryResetInterval) clearInterval(retryResetInterval)
    if (hourResetInterval) clearInterval(hourResetInterval)
    if (safetyCheckInterval) clearInterval(safetyCheckInterval)
    if (evaluationTimer) clearInterval(evaluationTimer)
  },

  // --- Circuit Breakers ---

  recordCircuitFailure(name: CircuitBreakerName, error: string): void {
    const cb = circuitBreakers[name]
    if (!cb) return
    if (cb.state === 'open') return

    cb.failureCount++
    cb.lastFailureAt = Date.now()

    if (cb.failureCount >= cb.failureThreshold) {
      cb.state = 'open'
      cb.openedAt = Date.now()
      logger.error(`Circuit breaker OPENED: ${name} (${error})`)
      incidentForensics.recordEvent('circuit_breaker', { breaker: name, state: 'opened', error })
      metrics.setGauge(`pos_circuit_breaker_${name}`, {}, 1)
      persistCircuitBreakers()

      if (name === 'sync') {
        degradedModeEngine.reportComponentFailure('syncEngine', `Circuit breaker: ${error}`)
      } else if (name === 'storage') {
        degradedModeEngine.reportComponentFailure('indexedDB', `Circuit breaker: ${error}`)
      } else if (name === 'recovery') {
        degradedModeEngine.reportComponentFailure('recovery', `Circuit breaker: ${error}`)
        if (escalationLevel < 1) this.escalateFailure('recovery circuit breaker opened')
      } else if (name === 'diagnostics') {
        degradedModeEngine.reportComponentFailure('diagnostics', `Circuit breaker: ${error}`)
      }
    }

    persistCircuitBreakers()
  },

  recordCircuitSuccess(name: CircuitBreakerName): void {
    const cb = circuitBreakers[name]
    if (!cb) return

    if (cb.state === 'half_open') {
      cb.state = 'closed'
      cb.failureCount = 0
      cb.openedAt = null
      cb.halfOpenAt = null
      logger.info(`Circuit breaker CLOSED: ${name}`)
      metrics.setGauge(`pos_circuit_breaker_${name}`, {}, 0)

      if (name === 'sync') degradedModeEngine.reportComponentRecovery('syncEngine')
      else if (name === 'storage') degradedModeEngine.reportComponentRecovery('indexedDB')
      else if (name === 'recovery') degradedModeEngine.reportComponentRecovery('recovery')
      else if (name === 'diagnostics') degradedModeEngine.reportComponentRecovery('diagnostics')

      persistCircuitBreakers()
    } else if (cb.state === 'closed') {
      cb.failureCount = Math.max(0, cb.failureCount - 1)
      persistCircuitBreakers()
    }
  },

  isCircuitOpen(name: CircuitBreakerName): boolean {
    const cb = circuitBreakers[name]
    if (!cb) return false
    if (cb.state === 'open') {
      if (cb.openedAt && Date.now() - cb.openedAt > cb.resetTimeoutMs) {
        cb.state = 'half_open'
        cb.halfOpenAt = Date.now()
        persistCircuitBreakers()
        logger.info(`Circuit breaker half-open: ${name}`)
        return false
      }
      return true
    }
    return false
  },

  getCircuitBreaker(name: CircuitBreakerName): CircuitBreaker {
    return { ...circuitBreakers[name] }
  },

  getAllCircuitBreakers(): Record<CircuitBreakerName, CircuitBreaker> {
    const result = {} as Record<CircuitBreakerName, CircuitBreaker>
    for (const [name, cb] of Object.entries(circuitBreakers)) {
      result[name as CircuitBreakerName] = { ...cb }
    }
    return result
  },

  async evaluateCircuitBreakers(): Promise<void> {
    for (const cb of Object.values(circuitBreakers)) {
      if (cb.state === 'open') {
        if (cb.openedAt && Date.now() - cb.openedAt > cb.resetTimeoutMs) {
          cb.state = 'half_open'
          cb.halfOpenAt = Date.now()
          persistCircuitBreakers()
          logger.info(`Circuit breaker auto half-open: ${cb.name}`)
        }
      }
    }
  },

  resetCircuitBreaker(name: CircuitBreakerName): void {
    const cb = circuitBreakers[name]
    if (cb) {
      cb.state = 'closed'
      cb.failureCount = 0
      cb.openedAt = null
      cb.halfOpenAt = null
      persistCircuitBreakers()
      logger.info(`Circuit breaker manually reset: ${name}`)
    }
  },

  resetAllCircuitBreakers(): void {
    for (const cb of Object.values(circuitBreakers)) {
      cb.state = 'closed'
      cb.failureCount = 0
      cb.openedAt = null
      cb.halfOpenAt = null
    }
    persistCircuitBreakers()
    logger.info('All circuit breakers reset')
  },

  // --- Recovery Governor ---

  canRetry(): boolean {
    if (governor.governorLocked) {
      if (governor.governorLockedUntil && Date.now() > governor.governorLockedUntil) {
        governor.governorLocked = false
        governor.governorLockedUntil = null
      } else {
        return false
      }
    }
    return governor.retriesThisMinute < governor.retryLimitPerMinute
  },

  recordRetry(): void {
    governor.retriesThisMinute++
    governor.lastRecoveryAt = Date.now()
  },

  canRunRecovery(): boolean {
    return governor.consecutiveRecoveries < governor.consecutiveRecoveryLimit
  },

  recordRecovery(success: boolean): void {
    if (success) {
      governor.consecutiveRecoveries = 0
      governor.retriesThisMinute = 0
    } else {
      governor.consecutiveRecoveries++
      if (governor.consecutiveRecoveries >= governor.consecutiveRecoveryLimit) {
        logger.error('Consecutive recovery limit reached, escalating')
        escalationLevel = Math.min(3, escalationLevel + 1)
        this.escalateFailure(`recovery loop detected: ${governor.consecutiveRecoveries} consecutive failures`)
      }
    }
  },

  canRunRepair(): boolean {
    return governor.repairAttemptsThisHour < governor.repairLimitPerHour
  },

  recordRepair(): void {
    governor.repairAttemptsThisHour++
    governor.lastRepairAt = Date.now()
  },

  canSelfHeal(): boolean {
    return governor.selfHealFrequency < governor.selfHealLimitPerHour
  },

  recordSelfHeal(): void {
    governor.selfHealFrequency++
  },

  escalateFailure(reason: string): void {
    logger.error(`Escalation level ${escalationLevel}: ${reason}`)

    if (escalationLevel >= 3) {
      governor.governorLocked = true
      governor.governorLockedUntil = Date.now() + 300000
      degradedModeEngine.enterEmergencyMode(`Critical escalation: ${reason}`)
    } else if (escalationLevel >= 1) {
      degradedModeEngine.enterDegradedMode(`Escalation: ${reason}`)
    }

    incidentForensics.recordEvent('degraded_mode', { escalationLevel, reason })
  },

  lockGovernor(durationMs = 60000): void {
    governor.governorLocked = true
    governor.governorLockedUntil = Date.now() + durationMs
  },

  unlockGovernor(): void {
    governor.governorLocked = false
    governor.governorLockedUntil = null
  },

  getGovernorState(): RecoveryGovernorState {
    return { ...governor }
  },

  // --- Runtime Safety ---

  async runSafetyCheck(): Promise<RuntimeSafetyState> {
    const violations: string[] = []

    const mem = (performance as any).memory
    if (mem) {
      const usedMB = Math.round(mem.usedJSHeapSize / 1048576)
      if (usedMB > safety.memoryLimitMB) {
        violations.push(`Memory exceeded: ${usedMB}MB > ${safety.memoryLimitMB}MB`)
        metrics.setGauge('pos_safety_memory_violation', {}, 1)
      }
    }

    try {
      const db = await getDB()
      const allItems = await db.getAll('queueItems')
      if (allItems.length > safety.maxQueueSize) {
        violations.push(`Queue size exceeded: ${allItems.length} > ${safety.maxQueueSize}`)
        metrics.setGauge('pos_safety_queue_size_violation', {}, 1)
      }

      const highRetryItems = allItems.filter(i => i.attempts > safety.maxRetriesPerItem)
      if (highRetryItems.length > 0) {
        violations.push(`${highRetryItems.length} items exceeded max retries (${safety.maxRetriesPerItem})`)
      }
    } catch { /* noop */ }

    if (safety.snapshotCountThisHour > safety.maxSnapshotsPerHour) {
      violations.push(`Snapshot rate exceeded: ${safety.snapshotCountThisHour}/hr`)
    }

    safety.violations = violations.slice(-50)
    safety.lastSafetyCheck = Date.now()

    if (violations.length > 0) {
      logger.warn(`Safety violations: ${violations.join('; ')}`)

      if (violations.some(v => v.includes('Memory exceeded'))) {
        degradedModeEngine.enterDegradedMode('Memory safety violation')
      }
    }

    return { ...safety }
  },

  checkSnapshotRate(): boolean {
    if (safety.snapshotCountThisHour >= safety.maxSnapshotsPerHour) return false
    safety.snapshotCountThisHour++
    return true
  },

  checkTelemetryRate(): boolean {
    if (safety.telemetryCountThisMinute >= safety.maxTelemetryEventsPerMinute) return false
    safety.telemetryCountThisMinute++
    return true
  },

  getSafetyState(): RuntimeSafetyState {
    return { ...safety }
  },

  getEscalationLevel(): number {
    return escalationLevel
  },
}
