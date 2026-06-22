import { createLogger } from './structuredLogger'
import { getDB, type QueueItemType } from './db'
import { incidentForensics } from './incidentForensics'
import { metrics } from './metricsCollector'

const logger = createLogger('DegradedMode')

export type OperationalStatus = 'normal' | 'degraded' | 'emergency' | 'recovery' | 'sync_delayed'

export interface DegradationRule {
  id: string
  condition: () => Promise<boolean> | boolean
  level: OperationalStatus
  description: string
  cooldownMs: number
  lastTriggeredAt: number | null
  escalationCount: number
}

export interface OperationalStatusInfo {
  status: OperationalStatus
  since: number
  activeDegradations: string[]
  components: Record<string, ComponentStatus>
  canSell: boolean
  message: string
  advisedAction: string | null
}

interface ComponentStatus {
  status: 'ok' | 'degraded' | 'failed' | 'bypassed'
  lastCheck: number
  description: string
}

const localStorageKey = 'pos_degraded_mode_state'
const EMERGENCY_CART_KEY = 'pos_emergency_cart'

let currentStatus: OperationalStatus = 'normal'
let statusSince = Date.now()
let activeDegradations: string[] = []
let storageFallbackMode: 'indexeddb' | 'memory' | 'localstorage' = 'indexeddb'
let emergencyModeActive = false
let recoveryCooldownTimer: ReturnType<typeof setTimeout> | null = null

// Fallback memory queue for when IndexedDB fails
const _memoryQueue: Array<{ id: string; type: string; payload: unknown; timestamp: number }> = []
let _memoryQueueFlushing = false

const components: Record<string, ComponentStatus> = {
  syncEngine: { status: 'ok', lastCheck: Date.now(), description: 'Sync engine' },
  indexedDB: { status: 'ok', lastCheck: Date.now(), description: 'IndexedDB storage' },
  telemetry: { status: 'ok', lastCheck: Date.now(), description: 'Telemetry system' },
  diagnostics: { status: 'ok', lastCheck: Date.now(), description: 'Diagnostic system' },
  recovery: { status: 'ok', lastCheck: Date.now(), description: 'Recovery engine' },
  scanner: { status: 'ok', lastCheck: Date.now(), description: 'Scanner' },
  cart: { status: 'ok', lastCheck: Date.now(), description: 'Shopping cart' },
  checkout: { status: 'ok', lastCheck: Date.now(), description: 'Checkout' },
}

let degRules: DegradationRule[] = []
let checkInterval: ReturnType<typeof setInterval> | null = null
let listeners: Array<(info: OperationalStatusInfo) => void> = []

function uid(): string {
  return crypto.randomUUID?.() || 'deg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
}

function persistState(): void {
  try {
    const state = {
      currentStatus,
      statusSince,
      activeDegradations,
      storageFallbackMode,
      emergencyModeActive,
      components,
    }
    localStorage.setItem(localStorageKey, JSON.stringify(state))
  } catch { /* noop */ }
}

function loadState(): void {
  try {
    const raw = localStorage.getItem(localStorageKey)
    if (raw) {
      const state = JSON.parse(raw)
      currentStatus = state.currentStatus || 'normal'
      statusSince = state.statusSince || Date.now()
      activeDegradations = state.activeDegradations || []
      storageFallbackMode = state.storageFallbackMode || 'indexeddb'
      emergencyModeActive = state.emergencyModeActive || false
      if (state.components) Object.assign(components, state.components)
    }
  } catch { /* noop */ }
}

function notifyListeners(): void {
  const info = degradedModeEngine.getOperationalStatus()
  for (const listener of listeners) {
    try { listener(info) } catch { /* noop */ }
  }
}

export const degradedModeEngine = {
  init(): void {
    loadState()
    this.defineRules()
    checkInterval = setInterval(() => this.evaluateDegradation(), 30000)
    logger.info(`Degraded mode engine initialized: ${currentStatus}`)
  },

  destroy(): void {
    if (checkInterval) clearInterval(checkInterval)
    listeners = []
  },

  subscribe(fn: (info: OperationalStatusInfo) => void): () => void {
    listeners.push(fn)
    return () => {
      listeners = listeners.filter(l => l !== fn)
    }
  },

  defineRules(): void {
    degRules = [
      {
        id: 'sync_failure_storm',
        condition: () => {
          const syncStatus = components.syncEngine?.status
          return syncStatus === 'failed'
        },
        level: 'degraded',
        description: 'Sync engine failures detected',
        cooldownMs: 60000,
        lastTriggeredAt: null,
        escalationCount: 0,
      },
      {
        id: 'indexeddb_failure',
        condition: () => {
          const dbStatus = components.indexedDB?.status
          return dbStatus === 'failed'
        },
        level: 'emergency',
        description: 'IndexedDB unavailable, switching to emergency mode',
        cooldownMs: 120000,
        lastTriggeredAt: null,
        escalationCount: 0,
      },
      {
        id: 'telemetry_failure',
        condition: () => components.telemetry?.status === 'failed',
        level: 'degraded',
        description: 'Telemetry system degraded',
        cooldownMs: 120000,
        lastTriggeredAt: null,
        escalationCount: 0,
      },
      {
        id: 'recovery_loop',
        condition: () => components.recovery?.status === 'failed',
        level: 'emergency',
        description: 'Recovery engine failed repeatedly, entering emergency mode',
        cooldownMs: 300000,
        lastTriggeredAt: null,
        escalationCount: 0,
      },
      {
        id: 'diagnostics_failure',
        condition: () => components.diagnostics?.status === 'failed',
        level: 'degraded',
        description: 'Diagnostics system unavailable',
        cooldownMs: 120000,
        lastTriggeredAt: null,
        escalationCount: 0,
      },
      {
        id: 'memory_pressure',
        condition: () => {
          const mem = (performance as any).memory
          if (!mem) return false
          return (mem.usedJSHeapSize / mem.totalJSHeapSize) > 0.92
        },
        level: 'degraded',
        description: 'High memory pressure, disabling non-critical systems',
        cooldownMs: 60000,
        lastTriggeredAt: null,
        escalationCount: 0,
      },
      {
        id: 'quota_pressure',
        condition: async () => {
          try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
              const estimate = await navigator.storage.estimate()
              if (estimate.quota && estimate.usage) {
                return (estimate.usage / estimate.quota) > 0.9
              }
            }
          } catch { /* noop */ }
          return false
        },
        level: 'degraded',
        description: 'Storage quota near limit, initiating cleanup',
        cooldownMs: 300000,
        lastTriggeredAt: null,
        escalationCount: 0,
      },
    ]
  },

  async evaluateDegradation(): Promise<void> {
    for (const rule of degRules) {
      if (rule.lastTriggeredAt && Date.now() - rule.lastTriggeredAt < rule.cooldownMs) continue

      try {
        const triggered = await rule.condition()
        if (!triggered) {
          if (activeDegradations.includes(rule.id)) {
            activeDegradations = activeDegradations.filter(d => d !== rule.id)
          }
          continue
        }

        if (activeDegradations.includes(rule.id)) {
          rule.escalationCount++
          if (rule.escalationCount >= 3 && rule.level === 'degraded') {
            this.enterEmergencyMode(`Rule ${rule.id} escalated after ${rule.escalationCount} triggers`)
          }
          continue
        }

        rule.lastTriggeredAt = Date.now()
        activeDegradations.push(rule.id)

        if (rule.level === 'emergency') {
          this.enterEmergencyMode(rule.description)
        } else if (rule.level === 'degraded') {
          this.enterDegradedMode(rule.description)
        }
      } catch (e) {
        logger.error(`Rule evaluation failed: ${rule.id}`, e)
      }
    }

    if (activeDegradations.length === 0 && currentStatus !== 'normal') {
      if (currentStatus === 'degraded') this.restoreNormal()
    }

    persistState()
    notifyListeners()
  },

  enterDegradedMode(reason: string): void {
    if (currentStatus === 'emergency') return
    const prev = currentStatus
    currentStatus = 'degraded'
    statusSince = Date.now()
    logger.warn(`Entering degraded mode: ${reason}`)
    incidentForensics.recordEvent('degraded_mode', { reason, previous: prev })
    metrics.setGauge('pos_degraded_mode', {}, 1)
    metrics.setGauge('pos_emergency_mode', {}, 0)
    this.disableNonCriticalComponents()
    persistState()
    notifyListeners()
  },

  enterEmergencyMode(reason: string): void {
    const prev = currentStatus
    currentStatus = 'emergency'
    emergencyModeActive = true
    statusSince = Date.now()
    logger.error(`EMERGENCY MODE ACTIVATED: ${reason}`)
    incidentForensics.recordEvent('emergency_mode', { reason, previous: prev })
    metrics.setGauge('pos_degraded_mode', {}, 0)
    metrics.setGauge('pos_emergency_mode', {}, 1)
    this.activateEmergencyMinimalComponents()
    persistState()
    notifyListeners()
  },

  enterRecoveryState(reason: string): void {
    currentStatus = 'recovery'
    statusSince = Date.now()
    logger.info(`Entering recovery state: ${reason}`)
    persistState()
    notifyListeners()
  },

  restoreNormal(): void {
    const prev = currentStatus
    currentStatus = 'normal'
    emergencyModeActive = false
    statusSince = Date.now()
    activeDegradations = []
    this.resetAllComponents()
    persistState()
    logger.info('Restored to normal operation')
    metrics.setGauge('pos_degraded_mode', {}, 0)
    metrics.setGauge('pos_emergency_mode', {}, 0)
    notifyListeners()
  },

  disableNonCriticalComponents(): void {
    this.setComponentStatus('telemetry', 'degraded', 'Disabled in degraded mode')
    this.setComponentStatus('diagnostics', 'degraded', 'Reduced in degraded mode')
    if (components.syncEngine?.status === 'failed') {
      this.setComponentStatus('syncEngine', 'bypassed', 'Sync suspended in degraded mode')
    }
  },

  activateEmergencyMinimalComponents(): void {
    this.setComponentStatus('syncEngine', 'bypassed', 'Sync suspended in emergency mode')
    this.setComponentStatus('telemetry', 'bypassed', 'Telemetry disabled in emergency mode')
    this.setComponentStatus('diagnostics', 'bypassed', 'Diagnostics disabled in emergency mode')
    this.setComponentStatus('recovery', 'bypassed', 'Recovery suspended in emergency mode')
    this.setComponentStatus('scanner', 'ok', 'Scanner essential for sales')
    this.setComponentStatus('cart', 'ok', 'Cart essential for sales')
    this.setComponentStatus('checkout', 'ok', 'Checkout essential for sales')
    if (components.indexedDB?.status !== 'ok') {
      storageFallbackMode = 'memory'
    }
  },

  setComponentStatus(name: string, status: ComponentStatus['status'], description: string): void {
    components[name] = { status, lastCheck: Date.now(), description }
  },

  getComponentStatus(name: string): ComponentStatus | null {
    return components[name] || null
  },

  resetComponent(name: string): void {
    if (components[name]) {
      components[name] = { status: 'ok', lastCheck: Date.now(), description: components[name].description }
    }
  },

  resetAllComponents(): void {
    for (const key of Object.keys(components)) {
      components[key] = { status: 'ok', lastCheck: Date.now(), description: components[key]?.description || key }
    }
    storageFallbackMode = 'indexeddb'
  },

  getOperationalStatus(): OperationalStatusInfo {
    const activeNames = activeDegradations.map(id => {
      const rule = degRules.find(r => r.id === id)
      return rule ? rule.description : id
    })

    let message: string
    let advisedAction: string | null = null

    switch (currentStatus) {
      case 'normal':
        message = 'Sistema operando normalmente'
        break
      case 'degraded':
        message = 'Modo degradado: algunos módulos desactivados, ventas continúan'
        advisedAction = 'Revise el estado de sincronización cuando la conexión mejore'
        break
      case 'emergency':
        message = 'MODO EMERGENCIA: Solo ventas básicas disponibles'
        advisedAction = 'Contacte a soporte técnico lo antes posible'
        break
      case 'recovery':
        message = 'Recuperando sistemas después de incidente'
        advisedAction = 'Espere mientras se restauran los servicios'
        break
      case 'sync_delayed':
        message = 'Sincronización retrasada, ventas locales funcionando'
        break
      default:
        message = 'Estado desconocido'
    }

    return {
      status: currentStatus,
      since: statusSince,
      activeDegradations: activeNames,
      components: { ...components },
      canSell: currentStatus !== 'emergency' || true,
      message,
      advisedAction,
    }
  },

  isEmergencyMode(): boolean {
    return emergencyModeActive
  },

  isDegraded(): boolean {
    return currentStatus !== 'normal'
  },

  getStorageFallbackMode(): 'indexeddb' | 'memory' | 'localstorage' {
    return storageFallbackMode
  },

  setStorageFallbackMode(mode: 'indexeddb' | 'memory' | 'localstorage'): void {
    storageFallbackMode = mode
    persistState()
  },

  reportComponentFailure(componentName: string, error: string): void {
    const comp = components[componentName]
    if (comp) {
      if (comp.status === 'failed') return
      this.setComponentStatus(componentName, 'failed', error)
      logger.error(`Component failure: ${componentName}`, error)
      incidentForensics.recordEvent('critical_error', { component: componentName, error })
      this.evaluateDegradation().catch(() => {})
    }
  },

  reportComponentRecovery(componentName: string): void {
    const comp = components[componentName]
    if (comp && comp.status !== 'ok') {
      this.resetComponent(componentName)
      logger.info(`Component recovered: ${componentName}`)
      this.evaluateDegradation().catch(() => {})
    }
  },

  setSyncDelayed(): void {
    if (currentStatus === 'normal') {
      currentStatus = 'sync_delayed'
      statusSince = Date.now()
      persistState()
      notifyListeners()
    }
  },

  // Emergency cart operations
  saveEmergencyCart(cartData: unknown): void {
    try {
      localStorage.setItem(EMERGENCY_CART_KEY, JSON.stringify({
        data: cartData,
        savedAt: Date.now(),
      }))
    } catch { /* noop */ }
  },

  getEmergencyCart(): unknown | null {
    try {
      const raw = localStorage.getItem(EMERGENCY_CART_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (Date.now() - parsed.savedAt > 86400000) {
        localStorage.removeItem(EMERGENCY_CART_KEY)
        return null
      }
      return parsed.data
    } catch { return null }
  },

  clearEmergencyCart(): void {
    try { localStorage.removeItem(EMERGENCY_CART_KEY) } catch { /* noop */ }
  },

  enqueueMemoryFallback(type: string, payload: unknown): string {
    const id = uid()
    _memoryQueue.push({ id, type, payload, timestamp: Date.now() })
    if (_memoryQueue.length > 500) _memoryQueue.shift()
    return id
  },

  getMemoryQueueLength(): number {
    return _memoryQueue.length
  },

  async flushMemoryQueue(): Promise<number> {
    if (_memoryQueueFlushing || _memoryQueue.length === 0) return 0
    _memoryQueueFlushing = true
    let flushed = 0
    try {
      const db = await getDB()
      while (_memoryQueue.length > 0) {
        const item = _memoryQueue.shift()
        if (!item) break
        await db.put('queueItems', {
          id: item.id,
          type: item.type as QueueItemType,
          priority: 0,
          payload: item.payload,
          idempotencyKey: `mem-fallback-${item.id}`,
          correlationId: 'mem-fallback',
          status: 'pending',
          attempts: 0,
          maxAttempts: 5,
          lastError: null,
          nextRetryAt: Date.now() + 1000,
          createdAt: item.timestamp,
          updatedAt: Date.now(),
          checkpoint: 0,
          batchId: null,
        })
        flushed++
      }
      if (flushed > 0) logger.info(`Flushed ${flushed} items from memory fallback queue`)
    } catch (e) {
      logger.error('Memory queue flush failed', e)
    } finally {
      _memoryQueueFlushing = false
    }
    return flushed
  },

  // Re-attach degraded events when IndexedDB becomes available again
  async tryReattach(): Promise<boolean> {
    try {
      const db = await getDB()
      await db.count('queueItems')
      this.setComponentStatus('indexedDB', 'ok', 'IndexedDB reconnected')
      this.setStorageFallbackMode('indexeddb')
      if (currentStatus === 'emergency' && !activeDegradations.some(d => d.startsWith('indexeddb_failure'))) {
        currentStatus = 'degraded'
        statusSince = Date.now()
        persistState()
        notifyListeners()
      }
      await this.flushMemoryQueue()
      return true
    } catch {
      return false
    }
  },
}
