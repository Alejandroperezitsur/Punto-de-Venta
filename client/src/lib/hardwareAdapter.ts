import { deviceDetector } from './deviceDetector'
import { createLogger } from './structuredLogger'

const logger = createLogger('HardwareAdapter')

export interface HardwareState {
  level: 'low' | 'medium' | 'high'
  disableAnimations: boolean
  reduceShadows: boolean
  reduceRenderDensity: boolean
  disableExpensiveEffects: boolean
  reducePolling: boolean
  maxListItems: number
  virtualizeThreshold: number
  debounceMultiplier: number
}

let currentState: HardwareState = {
  level: 'high',
  disableAnimations: false,
  reduceShadows: false,
  reduceRenderDensity: false,
  disableExpensiveEffects: false,
  reducePolling: false,
  maxListItems: 100,
  virtualizeThreshold: 50,
  debounceMultiplier: 1,
}

let listeners: Array<(state: HardwareState) => void> = []
let initialized = false

function computeState(): HardwareState {
  const profile = deviceDetector.getCached()
  if (!profile) return currentState

  const isLow = profile.isLowEnd
  const isBatterySaver = deviceDetector.isBatterySaver()
  const reducedMotion = profile.reducedMotion

  const level = isLow ? 'low' : isBatterySaver ? 'medium' : 'high'

  return {
    level,
    disableAnimations: reducedMotion || isLow || isBatterySaver,
    reduceShadows: isLow || isBatterySaver,
    reduceRenderDensity: isLow,
    disableExpensiveEffects: isLow || isBatterySaver,
    reducePolling: isBatterySaver || isLow,
    maxListItems: isLow ? 20 : isBatterySaver ? 50 : 100,
    virtualizeThreshold: isLow ? 20 : 50,
    debounceMultiplier: isLow ? 3 : isBatterySaver ? 2 : 1,
  }
}

export const hardwareAdapter = {
  async init(): Promise<void> {
    if (initialized) return
    initialized = true

    await deviceDetector.detect()
    currentState = computeState()

    deviceDetector.subscribe(() => {
      currentState = computeState()
      for (const listener of listeners) listener(currentState)
    })

    if (currentState.level !== 'high') {
      logger.info(`Hardware adapter: ${currentState.level} performance level`)
    }
  },

  subscribe(listener: (state: HardwareState) => void): () => void {
    listeners.push(listener)
    listener(currentState)
    return () => {
      listeners = listeners.filter(l => l !== listener)
    }
  },

  getState(): HardwareState {
    return { ...currentState }
  },

  shouldDisableAnimations(): boolean {
    return currentState.disableAnimations
  },

  shouldReduceShadows(): boolean {
    return currentState.reduceShadows
  },

  shouldReduceRenderDensity(): boolean {
    return currentState.reduceRenderDensity
  },

  shouldDisableExpensiveEffects(): boolean {
    return currentState.disableExpensiveEffects
  },

  shouldReducePolling(): boolean {
    return currentState.reducePolling
  },

  getMaxListItems(): number {
    return currentState.maxListItems
  },

  getVirtualizeThreshold(): number {
    return currentState.virtualizeThreshold
  },

  getDebounceMultiplier(): number {
    return currentState.debounceMultiplier
  },

  adaptInterval(baseMs: number): number {
    if (this.shouldReducePolling()) return baseMs * 3
    if (this.getState().level === 'medium') return baseMs * 2
    return baseMs
  },
}

export function useHardwareAdaptation(): HardwareState {
  return hardwareAdapter.getState()
}
