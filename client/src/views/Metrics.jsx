import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getMetrics } from '../lib/api'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import Skeleton from '../components/ui/Skeleton'

function parseProm(text) {
  const lines = String(text||'').split('\n')
  const hist = { sum: {}, count: {} }
  const errCount = {}
  for (const ln of lines) {
    const mSum = ln.match(/^pos_http_request_duration_seconds_sum\{([^}]*)\}\s+(\d+(?:\.\d+)?)/)
    const mCnt = ln.match(/^pos_http_request_duration_seconds_count\{([^}]*)\}\s+(\d+)/)
    if (mSum) {
      const labels = Object.fromEntries(mSum[1].split(',').map(x => x.split('=')).map(([k,v])=>[k, String(v||'').replace(/^"|"$/g,'')]))
      const key = `${labels.method}:${labels.route}:${labels.status}`
      hist.sum[key] = parseFloat(mSum[2])
    }
    if (mCnt) {
      const labels = Object.fromEntries(mCnt[1].split(',').map(x => x.split('=')).map(([k,v])=>[k, String(v||'').replace(/^"|"$/g,'')]))
      const key = `${labels.method}:${labels.route}:${labels.status}`
      hist.count[key] = parseFloat(mCnt[2])
      if ((parseInt(labels.status,10) || 0) >= 500) errCount[labels.route] = (errCount[labels.route]||0) + parseFloat(mCnt[2])
    }
  }
  const routes = {}
  for (const k of Object.keys(hist.count)) {
    const [method, route, status] = k.split(':')
    const sum = hist.sum[k] || 0
    const cnt = hist.count[k] || 0
    const avg = cnt > 0 ? (sum / cnt) : 0
    const r = routes[route] || { route, samples: [], avg: 0 }
    r.samples.push({ method, status, avg })
    routes[route] = r
  }
  for (const r of Object.values(routes)) {
    r.avg = r.samples.reduce((s,x)=>s+x.avg,0) / (r.samples.length||1)
  }
  const list = Object.values(routes).sort((a,b)=>b.avg-a.avg)
  return { list, errCount }
}

function LineChart({ points }) {
  const w = 600, h = 200, pad = 20
  const xs = points.map((_,i)=>i)
  const ys = points.map(p=>p.y)
  const maxY = Math.max(0, ...ys)
  const path = points.map((p,i)=>{
    const x = pad + (i/(Math.max(1, points.length-1)))*(w-pad*2)
    const y = h-pad - (maxY>0 ? (p.y/maxY)*(h-pad*2) : 0)
    return `${i===0?'M':'L'}${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} style={{ background: 'var(--bg2)', borderRadius: 6 }}>
      <path d={path} stroke="var(--primary)" fill="none" strokeWidth="2" />
    </svg>
  )
}

function Metrics() {
  const [text, setText] = useState('')
  const [routes, setRoutes] = useState([])
  const [errorsByRoute, setErrorsByRoute] = useState({})
  const [series, setSeries] = useState([])
  const [busy, setBusy] = useState(false)
  const refresh = async () => {
    setBusy(true)
    try {
      const t = await getMetrics()
      setText(t)
      const p = parseProm(t)
      setRoutes(p.list)
      setErrorsByRoute(p.errCount)
      const avgAll = p.list.length ? (p.list.reduce((s,r)=>s+r.avg,0)/p.list.length) : 0
      setSeries(s => [...s.slice(-49), { x: Date.now(), y: avgAll }])
    } catch {} finally { setBusy(false) }
  }
  useEffect(() => { refresh() }, [])
  const topSlow = useMemo(() => routes.slice(0, 10), [routes])
  return (
    <div className="container">
      <Breadcrumbs items={["Admin","Métricas"]} />
      <h2>Métricas</h2>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={refresh}>Refrescar métricas</button>
      </div>
      <div className="grid-3" style={{ gap: 12, marginTop: 8 }}>
        <div className="card"><h4>Latencia promedio</h4><div className="muted">{routes.length ? (routes.reduce((s,r)=>s+r.avg,0)/routes.length).toFixed(3) : '0.000'} s</div></div>
        <div className="card"><h4>Rutas con error</h4><div className="muted">{Object.keys(errorsByRoute).length}</div></div>
        <div className="card"><h4>Muestras</h4><div className="muted">{series.length}</div></div>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <h3>Latencia (línea)</h3>
        {busy && series.length===0 ? <Skeleton lines={4} /> : <LineChart points={series} />}
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <h3>Top rutas lentas</h3>
        <table className="table"><thead><tr><th>Ruta</th><th>Promedio (s)</th></tr></thead><tbody>
          {topSlow.map(r => (<tr key={r.route}><td>{r.route}</td><td className="right">{r.avg.toFixed(3)}</td></tr>))}
        </tbody></table>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <h3>Errores por ruta</h3>
        <table className="table"><thead><tr><th>Ruta</th><th>Errores</th></tr></thead><tbody>
          {Object.keys(errorsByRoute).map(rt => (<tr key={rt}><td>{rt}</td><td className="right">{errorsByRoute[rt]}</td></tr>))}
        </tbody></table>
      </div>
    </div>
  )
}

export default Metrics
