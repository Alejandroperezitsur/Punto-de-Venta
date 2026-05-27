import { useEffect, useRef, useCallback } from 'react'
import { performanceTelemetry } from '../lib/performanceTelemetry'

export function useTelemetryTimer(name: string, deps: unknown[] = []) {
  const startRef = useRef(0)

  useEffect(() => {
    startRef.current = performance.now()
    return () => {
      const duration = performance.now() - startRef.current
      performanceTelemetry.record(name, duration)
    }
  }, deps)
}

export function useTelemetryMetric(name: string, fn: () => number, intervalMs = 10000) {
  useEffect(() => {
    const id = setInterval(() => {
      const value = fn()
      performanceTelemetry.record(name, value)
    }, intervalMs)
    return () => clearInterval(id)
  }, [name, fn, intervalMs])
}

export function useAsyncTelemetry<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T,
): T {
  const fnRef = useRef(fn)
  fnRef.current = fn

  return useCallback(async (...args: any[]) => {
    const start = performance.now()
    try {
      const result = await fnRef.current(...args)
      performanceTelemetry.record(`${name}.success`, performance.now() - start)
      return result
    } catch (e) {
      performanceTelemetry.record(`${name}.error`, performance.now() - start)
      throw e
    }
  }, [name]) as unknown as T
}

export function useRenderTelemetry(componentName: string) {
  const renderCount = useRef(0)
  const mountTime = useRef(performance.now())

  renderCount.current++

  useEffect(() => {
    mountTime.current = performance.now()
    return () => {
      const lifetime = performance.now() - mountTime.current
      performanceTelemetry.record(`render.${componentName}.lifetime`, lifetime)
    }
  }, [componentName])

  useEffect(() => {
    performanceTelemetry.record(`render.${componentName}.count`, renderCount.current)
  })
}

export function useInteractionTelemetry(target: string) {
  return useCallback(() => {
    performanceTelemetry.record(`interaction.${target}`, 0)
  }, [target])
}
