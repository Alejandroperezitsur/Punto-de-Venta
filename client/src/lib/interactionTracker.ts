import { performanceTelemetry } from './performanceTelemetry'

type InteractionEvent = {
  type: string
  target: string
  timestamp: number
  metadata?: Record<string, unknown>
}

const MAX_EVENTS = 300
const events: InteractionEvent[] = []
let clickCounts = new Map<string, { count: number; firstClick: number }>()
let scanCounts = new Map<string, { count: number; firstScan: number }>()
let enabled = true

const RAGE_CLICK_WINDOW = 2000
const RAGE_CLICK_THRESHOLD = 5
const REPEATED_SCAN_WINDOW = 5000
const REPEATED_SCAN_THRESHOLD = 5

let focusRestoreCount = 0
let retryCount = 0
let failedActionCount = 0
let doubleSubmitCount = 0
let scannerRecoveryCount = 0
let lastSubmitTime = 0
const DOUBLE_SUBMIT_WINDOW = 2000

function record(type: string, target: string, metadata?: Record<string, unknown>): void {
  if (!enabled) return
  const event: InteractionEvent = { type, target, timestamp: Date.now(), metadata }
  events.push(event)
  if (events.length > MAX_EVENTS) events.shift()
}

export const interactionTracker = {
  enable() { enabled = true },
  disable() { enabled = false },

  trackClick(target: string): void {
    const now = Date.now()
    const existing = clickCounts.get(target) || { count: 0, firstClick: now }
    if (now - existing.firstClick > RAGE_CLICK_WINDOW) {
      existing.count = 1
      existing.firstClick = now
    } else {
      existing.count++
    }
    clickCounts.set(target, existing)
    record('click', target)

    if (existing.count >= RAGE_CLICK_THRESHOLD) {
      this.trackRageClick(target, existing.count)
    }
  },

  trackRageClick(target: string, count: number): void {
    record('rage_click', target, { count })
    performanceTelemetry.record('interaction.rage_click', 0, { target, count })
  },

  trackScan(barcode: string): void {
    const now = Date.now()
    const existing = scanCounts.get(barcode) || { count: 0, firstScan: now }
    if (now - existing.firstScan > REPEATED_SCAN_WINDOW) {
      existing.count = 1
      existing.firstScan = now
    } else {
      existing.count++
    }
    scanCounts.set(barcode, existing)
    record('scan', barcode)

    if (existing.count >= REPEATED_SCAN_THRESHOLD) {
      this.trackRepeatedScan(barcode, existing.count)
    }
  },

  trackRepeatedScan(barcode: string, count: number): void {
    record('repeated_scan', barcode, { count })
    performanceTelemetry.record('interaction.repeated_scan', 0, { barcode, count })
  },

  trackFocusRestore(): void {
    focusRestoreCount++
    record('focus_restore', 'scanner')
  },

  trackRetry(action: string): void {
    retryCount++
    record('retry', action)
    performanceTelemetry.record('interaction.retry', 0, { action })
  },

  trackFailedAction(action: string, error?: string): void {
    failedActionCount++
    record('failed_action', action, { error })
    performanceTelemetry.record('interaction.failed_action', 0, { action, error })
  },

  trackDoubleSubmit(action: string): void {
    const now = Date.now()
    if (now - lastSubmitTime < DOUBLE_SUBMIT_WINDOW) {
      doubleSubmitCount++
      record('double_submit', action)
      performanceTelemetry.record('interaction.double_submit', 0, { action })
    }
    lastSubmitTime = now
  },

  trackScannerRecovery(reason: string): void {
    scannerRecoveryCount++
    record('scanner_recovery', reason)
    performanceTelemetry.record('interaction.scanner_recovery', 0, { reason })
  },

  getEvents(): InteractionEvent[] {
    return [...events]
  },

  getCounts(): {
    rageClicks: number
    repeatedScans: number
    focusRestores: number
    retries: number
    failedActions: number
    doubleSubmits: number
    scannerRecoveries: number
  } {
    return {
      rageClicks: events.filter(e => e.type === 'rage_click').length,
      repeatedScans: events.filter(e => e.type === 'repeated_scan').length,
      focusRestores: focusRestoreCount,
      retries: retryCount,
      failedActions: failedActionCount,
      doubleSubmits: doubleSubmitCount,
      scannerRecoveries: scannerRecoveryCount,
    }
  },

  clear(): void {
    events.length = 0
    clickCounts.clear()
    scanCounts.clear()
    focusRestoreCount = 0
    retryCount = 0
    failedActionCount = 0
    doubleSubmitCount = 0
    scannerRecoveryCount = 0
  },
}

export type { InteractionEvent }
