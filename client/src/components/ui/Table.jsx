import React, { useMemo, useState } from 'react'
const Table = React.memo(function Table({ columns=[], rows=[], className='', stickyFirst=false, pageSize=0, filterable=false }) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const cls = ['table', stickyFirst?'sticky-first':'', className].filter(Boolean).join(' ')
  const filtered = useMemo(() => {
    if (!filterable) return rows
    const q = (query || '').trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => {
      try {
        return Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q))
      } catch { return true }
    })
  }, [rows, query, filterable])
  const totalPages = useMemo(() => {
    if (!pageSize || pageSize <= 0) return 1
    return Math.max(1, Math.ceil(filtered.length / pageSize))
  }, [filtered.length, pageSize])
  const pageRows = useMemo(() => {
    if (!pageSize || pageSize <= 0) return filtered
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])
  const goto = (p) => setPage(Math.max(1, Math.min(totalPages, p)))
  return (
    <div>
      {filterable && (
        <div className="table-topbar">
          <input className="input" placeholder="Filtrar rápido..." value={query} onChange={e => { setQuery(e.target.value); setPage(1) }} />
        </div>
      )}
      <table className={cls}>
        <thead><tr>{columns.map(c => <th key={c.key||c.title}>{c.title}</th>)}</tr></thead>
        <tbody className="route-enter">{pageRows.map((r,i)=>(<tr key={r.id||i}>{columns.map(c => <td key={c.key||c.title} className={c.className||''}>{typeof c.render==='function'?c.render(r):r[c.key]}</td>)}</tr>))}</tbody>
      </table>
      {pageSize > 0 && totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" onClick={() => goto(page-1)} disabled={page<=1} title="Anterior">‹</button>
          <span className="muted">Página {page} de {totalPages}</span>
          <button className="page-btn" onClick={() => goto(page+1)} disabled={page>=totalPages} title="Siguiente">›</button>
        </div>
      )}
    </div>
  )
})
export default Table
