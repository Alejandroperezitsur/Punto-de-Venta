import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getAudits, getAuditEvents } from '../lib/api'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import Skeleton from '../components/ui/Skeleton'

function AuditFilters({ filters, onChange, events }) {
  const [local, setLocal] = useState(filters)
  useEffect(() => { setLocal(filters) }, [filters])
  const apply = () => onChange(local)
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <h3>Filtros</h3>
      <div className="grid-4" style={{ gap: 8 }}>
        <div className="field"><span className="label">Desde</span><input type="date" value={local.startDate || ''} onChange={e=>setLocal({ ...local, startDate: e.target.value })} /></div>
        <div className="field"><span className="label">Hasta</span><input type="date" value={local.endDate || ''} onChange={e=>setLocal({ ...local, endDate: e.target.value })} /></div>
        <div className="field"><span className="label">Usuario</span><input type="text" placeholder="ID" value={local.userId || ''} onChange={e=>setLocal({ ...local, userId: e.target.value })} /></div>
        <div className="field"><span className="label">Evento</span><select value={local.event || ''} onChange={e=>setLocal({ ...local, event: e.target.value })}>
          <option value="">Todos</option>
          {events.map(ev => (<option key={ev} value={ev}>{ev}</option>))}
        </select></div>
        <div className="field" style={{ gridColumn: '1 / -1' }}><span className="label">Buscar</span><input type="text" placeholder="Texto libre" value={local.search || ''} onChange={e=>setLocal({ ...local, search: e.target.value })} /></div>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn" onClick={apply}>Aplicar</button>
      </div>
    </div>
  )
}

function AuditTable({ items, onShow }) {
  return (
    <table className="table">
      <thead><tr><th>Fecha/Hora</th><th>Usuario</th><th>Evento</th><th>Referencia</th><th>Data</th><th></th></tr></thead>
      <tbody>
        {items.map(row => (
          <tr key={row.id}>
            <td>{row.created_at}</td>
            <td>{row.user_id || '-'}</td>
            <td>{row.event}</td>
            <td>{[row.ref_type || '-', row.ref_id || '-'].join(' / ')}</td>
            <td style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(() => { try { const d = row.data ? JSON.parse(row.data) : null; return d ? JSON.stringify(d) : '' } catch { return String(row.data||'') } })()}</td>
            <td><button className="btn btn-ghost" onClick={() => onShow(row)}>Ver detalles</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function AuditDetailsModal({ item, onClose }) {
  if (!item) return null
  let pretty = ''
  try { pretty = JSON.stringify(item.data ? JSON.parse(item.data) : null, null, 2) } catch { pretty = String(item.data||'') }
  return (
    <div className="modal-overlay">
      <div className="card modal" style={{ maxWidth: 680 }}>
        <h3>Detalles</h3>
        <div className="muted">{item.event} • {item.created_at} • Usuario {item.user_id || '-'}</div>
        <pre style={{ background: 'var(--bg2)', padding: 10, borderRadius: 6, maxHeight: 360, overflow: 'auto' }}>{pretty}</pre>
        <div className="modal-actions"><button className="btn" onClick={onClose}>Cerrar</button></div>
      </div>
    </div>
  )
}

function Audits() {
  const [events, setEvents] = useState([])
  const [filters, setFilters] = useState({ startDate: '', endDate: '', userId: '', event: '', search: '', limit: 20, offset: 0 })
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [show, setShow] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { (async () => { try { const list = await getAuditEvents(); setEvents(list) } catch {} })() }, [])
  const load = async () => {
    setBusy(true)
    try {
      const q = (() => { const o = { ...filters }; if (o.startDate) o.startDate = o.startDate + 'T00:00:00'; if (o.endDate) o.endDate = o.endDate + 'T23:59:59'; return o })()
      const r = await getAudits(q)
      setItems(r.items || [])
      setTotal(r.total || 0)
    } catch {} finally { setBusy(false) }
  }
  useEffect(() => { load() }, [filters.limit, filters.offset])
  const applyFilters = (f) => { setFilters({ ...filters, ...f, offset: 0 }) }

  const pages = useMemo(() => { const l = Math.max(1, filters.limit||20); return Math.ceil((total||0)/l) }, [total, filters.limit])
  const page = useMemo(() => { const l = Math.max(1, filters.limit||20); return Math.floor((filters.offset||0)/l)+1 }, [filters.offset, filters.limit])
  const setPage = (p) => { const l = Math.max(1, filters.limit||20); setFilters({ ...filters, offset: (Math.max(1,p)-1)*l }) }

  const exportCsv = () => {
    const headers = { created_at: 'Fecha/Hora', user_id: 'Usuario', event: 'Evento', ref_type: 'Ref Tipo', ref_id: 'Ref ID', data: 'Data' }
    const rows = items.map(r => ({ ...r, data: (() => { try { const d = r.data ? JSON.parse(r.data) : null; return d ? JSON.stringify(d) : '' } catch { return String(r.data||'') } })() }))
    const cols = Object.keys(headers)
    const head = cols.map(k => headers[k]).join(',')
    const body = rows.map(r => cols.map(k => { const v = r[k]; if (v == null) return ''; const s = String(v); const needsQuote = s.includes(',') || s.includes('\n') || s.includes('"'); const t = s.replace(/"/g, '""'); return needsQuote ? `"${t}"` : t }).join(',')).join('\n')
    const csv = head + '\n' + body
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'audits.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  return (
    <div className="container">
      <Breadcrumbs items={["Admin","Auditoría"]} />
      <h2>Auditoría</h2>
      <AuditFilters filters={filters} onChange={applyFilters} events={events} />
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="muted">Total: {total} • Página {page} de {pages}</div>
        <div className="row" style={{ gap: 8 }}>
          <select value={filters.limit} onChange={e=>setFilters({ ...filters, limit: parseInt(e.target.value,10), offset: 0 })} title="Tamaño de página">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <button className="btn" onClick={() => setPage(Math.max(1,page-1))} disabled={page<=1}>Anterior</button>
          <button className="btn" onClick={() => setPage(page+1)} disabled={page>=pages}>Siguiente</button>
          <button className="btn" onClick={exportCsv}>Exportar CSV</button>
        </div>
      </div>
      {busy ? <Skeleton lines={6} /> : <AuditTable items={items} onShow={setShow} />}
      <AuditDetailsModal item={show} onClose={() => setShow(null)} />
    </div>
  )
}

export default Audits
