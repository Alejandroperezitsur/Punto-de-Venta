import { useState, useEffect, useCallback, useRef } from 'react'
import { performanceTelemetry } from '../../lib/performanceTelemetry'
import { interactionTracker } from '../../lib/interactionTracker'
import { deviceDetector } from '../../lib/deviceDetector'

const DEV_MODE = import.meta.env.DEV || import.meta.env.VITE_DEV_OVERLAY === 'true'

function FPSMonitor() {
  const [fps, setFps] = useState(0)
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())

  useEffect(() => {
    let rafId: number
    const tick = () => {
      frameCount.current++
      const now = performance.now()
      const delta = now - lastTime.current
      if (delta >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / delta))
        frameCount.current = 0
        lastTime.current = now
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] font-mono">FPS</span>
      <span className={`text-[11px] font-mono font-bold ${fps < 30 ? 'text-red-400' : fps < 50 ? 'text-yellow-400' : 'text-green-400'}`}>
        {fps}
      </span>
    </div>
  )
}

function MemoryMonitor() {
  const [mem, setMem] = useState({ used: 0, total: 0, percent: 0 })

  useEffect(() => {
    const interval = setInterval(() => {
      const m = (performance as any).memory
      if (m) {
        const used = Math.round(m.usedJSHeapSize / 1048576)
        const total = Math.round(m.totalJSHeapSize / 1048576)
        setMem({ used, total, percent: Math.round((used / total) * 100) })
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  if (!(performance as any).memory) return null

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] font-mono">MEM</span>
      <span className={`text-[11px] font-mono ${mem.percent > 80 ? 'text-red-400' : mem.percent > 60 ? 'text-yellow-400' : 'text-green-400'}`}>
        {mem.used}MB / {mem.total}MB
      </span>
    </div>
  )
}

function TelemetryTable() {
  const [metrics, setMetrics] = useState<Record<string, any>>({})
  const [interactions, setInteractions] = useState<any>({})

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceTelemetry.getAllMetrics())
      setInteractions(interactionTracker.getCounts())
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const metricEntries = Object.entries(metrics)
  const interactionEntries = Object.entries(interactions)

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {metricEntries.slice(0, 20).map(([name, data]) => (
          <div key={name} className="flex justify-between text-[10px] font-mono">
            <span className="text-gray-400 truncate">{name}</span>
            <span className="text-white">
              {data.avg?.toFixed(1)}ms
              <span className="text-gray-500 ml-1">p95:{data.p95?.toFixed(0)}</span>
            </span>
          </div>
        ))}
      </div>
      {interactionEntries.length > 0 && (
        <div className="border-t border-gray-700 pt-1 mt-1">
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {interactionEntries.map(([name, count]) => (
              <div key={name} className="flex justify-between text-[10px] font-mono">
                <span className="text-gray-400">{name}</span>
                <span className={`${count > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DeviceInfo() {
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    deviceDetector.detect().then(setProfile)
  }, [])

  if (!profile) return null

  return (
    <div className="text-[10px] font-mono text-gray-400 space-y-0.5">
      <div>CPU: {profile.hardwareConcurrency} cores</div>
      <div>RAM: {profile.deviceMemory ?? '?'}GB</div>
      <div>Motion: {profile.reducedMotion ? 'reduced' : 'full'}</div>
      <div>Screen: {profile.screenSize}</div>
      {profile.connectionType && <div>Net: {profile.connectionType}</div>}
    </div>
  )
}

function ScanTimings() {
  const [data, setData] = useState({ avg: 0, count: 0 })

  useEffect(() => {
    const interval = setInterval(() => {
      const scanMarks = performanceTelemetry.getMarksByName('scan.latency')
      if (scanMarks.length > 0) {
        const avg = scanMarks.reduce((s, m) => s + m.duration, 0) / scanMarks.length
        setData({ avg, count: scanMarks.length })
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  if (data.count === 0) return null

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] font-mono">SCAN</span>
      <span className="text-[11px] font-mono text-green-400">
        {data.avg.toFixed(1)}ms
      </span>
      <span className="text-[10px] font-mono text-gray-500">
        ({data.count})
      </span>
    </div>
  )
}

export function PerformanceOverlay() {
  const [visible, setVisible] = useState(false)
  const [minimized, setMinimized] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'p' && e.ctrlKey && e.shiftKey) {
        e.preventDefault()
        setVisible(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const toggleMinimize = useCallback(() => setMinimized(v => !v), [])

  if (!DEV_MODE || !visible) return null

  return (
    <div
      className="fixed top-2 right-2 z-[9999] bg-gray-900/90 text-white rounded-lg border border-gray-700 shadow-2xl font-mono"
      style={{ maxWidth: 320, maxHeight: '80vh', overflow: 'auto' }}
    >
      <div className="flex items-center justify-between px-2 py-1 bg-gray-800 rounded-t-lg border-b border-gray-700">
        <span className="text-[10px] uppercase tracking-wider text-gray-400">Performance</span>
        <div className="flex gap-1">
          <button onClick={toggleMinimize} className="text-[10px] px-1 hover:text-white text-gray-400">
            {minimized ? '+' : '−'}
          </button>
          <button onClick={() => setVisible(false)} className="text-[10px] px-1 hover:text-white text-gray-400">
            ×
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="p-2 space-y-2">
          <div className="flex items-center gap-3">
            <FPSMonitor />
            <ScanTimings />
          </div>
          <MemoryMonitor />
          <TelemetryTable />
          <DeviceInfo />
        </div>
      )}
    </div>
  )
}
