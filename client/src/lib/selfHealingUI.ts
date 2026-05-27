import { createLogger } from './structuredLogger'

const logger = createLogger('SelfHeal')

export interface HealableState {
  status: 'ok' | 'degraded' | 'healing' | 'failed'
  lastError: string | null
  errorCount: number
  lastHealedAt: number | null
  healAttempts: number
}

export type StateKey = string

const states = new Map<StateKey, HealableState>()
const MAX_HEAL_ATTEMPTS = 3
const HEAL_COOLDOWN = 30000

function getState(key: StateKey): HealableState {
  if (!states.has(key)) {
    states.set(key, {
      status: 'ok',
      lastError: null,
      errorCount: 0,
      lastHealedAt: null,
      healAttempts: 0,
    })
  }
  return states.get(key)!
}

export const selfHealingUI = {
  recordError(key: StateKey, error: string): HealableState {
    const state = getState(key)
    state.status = 'failed'
    state.lastError = error
    state.errorCount++
    logger.warn(`[${key}] Error #${state.errorCount}: ${error}`)
    return { ...state }
  },

  async attemptHeal(key: StateKey, healFn: () => Promise<boolean>): Promise<{
    healed: boolean
    state: HealableState
    fallbackUsed: boolean
  }> {
    const state = getState(key)

    if (state.healAttempts >= MAX_HEAL_ATTEMPTS) {
      const cooldownRemaining = HEAL_COOLDOWN - (Date.now() - (state.lastHealedAt || 0))
      if (cooldownRemaining > 0) {
        return { healed: false, state: { ...state }, fallbackUsed: true }
      }
      state.healAttempts = 0
    }

    state.status = 'healing'
    state.healAttempts++

    try {
      const healed = await healFn()
      if (healed) {
        state.status = 'ok'
        state.lastHealedAt = Date.now()
        state.healAttempts = 0
        state.errorCount = 0
        state.lastError = null
        logger.info(`[${key}] Healed successfully`)
      } else {
        state.status = 'degraded'
        logger.warn(`[${key}] Heal returned false, using fallback`)
      }
      return { healed, state: { ...state }, fallbackUsed: !healed }
    } catch (e) {
      state.status = 'failed'
      const msg = e instanceof Error ? e.message : 'unknown'
      state.lastError = msg
      logger.error(`[${key}] Heal failed`, msg)
      return { healed: false, state: { ...state }, fallbackUsed: true }
    }
  },

  async attemptSilentRecovery<T>(
    key: StateKey,
    primaryFn: () => Promise<T>,
    fallbackFn: () => Promise<T>,
  ): Promise<{ result: T; usedFallback: boolean }> {
    try {
      const result = await primaryFn()
      const state = getState(key)
      if (state.status !== 'ok') {
        state.status = 'ok'
        state.lastError = null
      }
      return { result, usedFallback: false }
    } catch (e) {
      this.recordError(key, e instanceof Error ? e.message : 'unknown')
      try {
        const fallbackResult = await fallbackFn()
        return { result: fallbackResult, usedFallback: true }
      } catch (fallbackError) {
        logger.error(`[${key}] Fallback also failed`, fallbackError)
        throw fallbackError
      }
    }
  },

  getState(key: StateKey): HealableState {
    return { ...getState(key) }
  },

  resetState(key: StateKey): void {
    states.set(key, {
      status: 'ok',
      lastError: null,
      errorCount: 0,
      lastHealedAt: null,
      healAttempts: 0,
    })
  },

  isDegraded(key: StateKey): boolean {
    return getState(key).status !== 'ok'
  },
}
