export class LifecycleGuard {
  private mounted = false
  private abortController: AbortController | null = null
  private timers: Set<ReturnType<typeof setTimeout | typeof setInterval>> = new Set()
  private rafs: Set<number> = new Set()
  private cleanupFns: Array<() => void> = []

  onMount(): void {
    this.mounted = true
    this.abortController = new AbortController()
  }

  onUnmount(): void {
    this.mounted = false
    this.abortController?.abort()
    this.abortController = null
    for (const timer of this.timers) clearTimeout(timer)
    this.timers.clear()
    for (const timer of this.timers) clearInterval(timer)
    for (const raf of this.rafs) cancelAnimationFrame(raf)
    this.rafs.clear()
    for (const fn of this.cleanupFns) {
      try { fn() } catch { /* ignore */ }
    }
    this.cleanupFns = []
  }

  get isMounted(): boolean {
    return this.mounted
  }

  get signal(): AbortSignal | undefined {
    return this.abortController?.signal
  }

  setTimeout(handler: TimerHandler, timeout?: number): ReturnType<typeof setTimeout> {
    const id = setTimeout(() => {
      this.timers.delete(id)
      if (this.mounted) (handler as Function)()
    }, timeout) as unknown as ReturnType<typeof setTimeout>
    this.timers.add(id)
    return id
  }

  setInterval(handler: TimerHandler, timeout?: number): ReturnType<typeof setInterval> {
    const id = setInterval(() => {
      if (this.mounted) (handler as Function)()
    }, timeout) as unknown as ReturnType<typeof setInterval>
    this.timers.add(id)
    return id
  }

  requestAnimationFrame(callback: FrameRequestCallback): number {
    const id = requestAnimationFrame((t) => {
      this.rafs.delete(id)
      if (this.mounted) callback(t)
    })
    this.rafs.add(id)
    return id
  }

  addCleanup(fn: () => void): void {
    this.cleanupFns.push(fn)
  }

  createAsyncGuard<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T | null> {
    if (!this.abortController) return Promise.resolve(null)
    return fn(this.abortController.signal).catch((err) => {
      if (err?.name === 'AbortError') return null
      throw err
    })
  }
}

export function useLifecycleGuard(): LifecycleGuard {
  const guard = new LifecycleGuard()
  guard.onMount()
  return guard
}

export function createSafeAsyncEffect(
  fn: (guard: LifecycleGuard) => Promise<void>,
  deps: unknown[] = [],
): () => void {
  const guard = new LifecycleGuard()
  guard.onMount()
  let cancelled = false

  const run = async () => {
    if (cancelled) return
    try {
      await fn(guard)
    } catch (e) {
      if ((e as any)?.name === 'AbortError') return
      console.error('[SafeAsyncEffect]', e)
    }
  }

  run()

  return () => {
    cancelled = true
    guard.onUnmount()
  }
}
