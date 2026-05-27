export interface DeviceProfile {
  isLowEnd: boolean
  hardwareConcurrency: number
  deviceMemory: number | null
  cpuSpeed: 'slow' | 'medium' | 'fast'
  reducedMotion: boolean
  batterySaver: boolean | null
  connectionType: string | null
  touchOnly: boolean
  screenSize: 'small' | 'medium' | 'large'
}

let cachedProfile: DeviceProfile | null = null
let listeners = new Set<(profile: DeviceProfile) => void>()
let batterySaver = false

function detectScreenSize(): 'small' | 'medium' | 'large' {
  const w = window.innerWidth
  if (w < 640) return 'small'
  if (w < 1024) return 'medium'
  return 'large'
}

function getMatchMedia(query: string): MediaQueryList | null {
  try {
    return window.matchMedia(query)
  } catch {
    return null
  }
}

async function detectBatterySaver(): Promise<boolean> {
  try {
    if ('getBattery' in navigator) {
      const battery = await (navigator as any).getBattery()
      const saving = battery?.charging === false && battery?.level !== undefined && battery?.level !== null
      return saving
    }
  } catch { /* ignore */ }
  return false
}

function detectTouchOnly(): boolean {
  return 'ontouchstart' in window && !('onmouseover' in window) ||
    navigator.maxTouchPoints > 0 && window.innerWidth < 1024
}

export const deviceDetector = {
  async detect(): Promise<DeviceProfile> {
    if (cachedProfile) return cachedProfile

    const hwConcurrency = navigator.hardwareConcurrency || 2
    const deviceMemory = 'deviceMemory' in navigator ? (navigator as any).deviceMemory as number : null
    const reducedMotion = getMatchMedia('(prefers-reduced-motion: reduce)')?.matches ?? false

    batterySaver = await detectBatterySaver()

    let cpuSpeed: 'slow' | 'medium' | 'fast' = 'medium'
    if (hwConcurrency <= 2 || deviceMemory !== null && deviceMemory <= 2) {
      cpuSpeed = 'slow'
    } else if (hwConcurrency >= 6 && (deviceMemory === null || deviceMemory >= 4)) {
      cpuSpeed = 'fast'
    }

    const isLowEnd = hwConcurrency <= 2 ||
      (deviceMemory !== null && deviceMemory <= 2) ||
      (cpuSpeed === 'slow')

    const profile: DeviceProfile = {
      isLowEnd,
      hardwareConcurrency: hwConcurrency,
      deviceMemory,
      cpuSpeed,
      reducedMotion,
      batterySaver,
      connectionType: ((navigator as any)?.connection?.effectiveType as string) || null,
      touchOnly: detectTouchOnly(),
      screenSize: detectScreenSize(),
    }

    cachedProfile = profile
    return profile
  },

  getCached(): DeviceProfile | null {
    return cachedProfile
  },

  subscribe(listener: (profile: DeviceProfile) => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  async refresh(): Promise<DeviceProfile> {
    cachedProfile = null
    const profile = await this.detect()
    for (const listener of listeners) {
      try { listener(profile) } catch { /* ignore */ }
    }
    return profile
  },

  isLowEnd(): boolean {
    return cachedProfile?.isLowEnd ?? false
  },

  shouldReduceMotion(): boolean {
    return cachedProfile?.reducedMotion ?? false
  },

  isBatterySaver(): boolean {
    return batterySaver
  },

  getAnimationLevel(): 'none' | 'reduced' | 'full' {
    if (cachedProfile?.reducedMotion) return 'none'
    if (cachedProfile?.isLowEnd || batterySaver) return 'reduced'
    return 'full'
  },
}

;(async () => {
  await deviceDetector.detect()
  getMatchMedia('(prefers-reduced-motion: reduce)')?.addEventListener('change', async () => {
    await deviceDetector.refresh()
  })
  if ('connection' in navigator) {
    const conn = (navigator as any).connection
    if (conn) {
      conn.addEventListener('change', async () => {
        cachedProfile = null
        const profile = await deviceDetector.detect()
        for (const listener of listeners) listener(profile)
      })
    }
  }
})()
