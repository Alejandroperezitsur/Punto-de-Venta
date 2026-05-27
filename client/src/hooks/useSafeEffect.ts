import { useEffect, useRef, useCallback } from 'react'
import { LifecycleGuard } from '../lib/lifecycleGuard'

export function useSafeEffect(
  effect: (guard: LifecycleGuard) => (() => void) | void,
  deps: unknown[] = [],
): void {
  const guardRef = useRef<LifecycleGuard | null>(null)

  useEffect(() => {
    const guard = new LifecycleGuard()
    guard.onMount()
    guardRef.current = guard
    const cleanup = effect(guard) || (() => {})
    return () => {
      guard.onUnmount()
      cleanup()
    }
  }, deps)
}

export function useSafeAsyncEffect(
  effect: (guard: LifecycleGuard) => Promise<void>,
  deps: unknown[] = [],
): void {
  useEffect(() => {
    const guard = new LifecycleGuard()
    guard.onMount()
    let cancelled = false
    effect(guard).catch((e) => {
      if (e?.name === 'AbortError' || cancelled) return
      console.error('[useSafeAsyncEffect]', e)
    })
    return () => {
      cancelled = true
      guard.onUnmount()
    }
  }, deps)
}

export function useStableCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef(fn)
  ref.current = fn
  return useCallback((...args: any[]) => ref.current(...args), []) as T
}

export function useTimerCleanup(): {
  setTimeout: (handler: () => void, timeout: number) => number
  setInterval: (handler: () => void, timeout: number) => number
  requestAnimationFrame: (callback: FrameRequestCallback) => number
} {
  const timers = useRef<Set<ReturnType<typeof setTimeout | typeof setInterval>>>(new Set())
  const rafs = useRef<Set<number>>(new Set())

  useEffect(() => {
    return () => {
      for (const t of timers.current) clearTimeout(t)
      for (const t of timers.current) clearInterval(t)
      for (const r of rafs.current) cancelAnimationFrame(r)
      timers.current.clear()
      rafs.current.clear()
    }
  }, [])

  return {
    setTimeout: (handler, timeout) => {
      const id = window.setTimeout(() => {
        timers.current.delete(id)
        handler()
      }, timeout)
      timers.current.add(id)
      return id
    },
    setInterval: (handler, timeout) => {
      const id = window.setInterval(handler, timeout)
      timers.current.add(id)
      return id
    },
    requestAnimationFrame: (callback) => {
      const id = requestAnimationFrame((t) => {
        rafs.current.delete(id)
        callback(t)
      })
      rafs.current.add(id)
      return id
    },
  }
}

export function useMountedRef(): { readonly current: boolean } {
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])
  return mountedRef
}
