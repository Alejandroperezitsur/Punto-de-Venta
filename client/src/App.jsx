import React, { useEffect, useMemo, useState, useRef } from 'react'
import jsPDF from 'jspdf'

const API = 'http://localhost:3001/api'

async function api(path, options) {
  let res
  try {
    const token = localStorage.getItem('token') || ''
    const baseHeaders = { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    const headers = token ? { ...baseHeaders, Authorization: `Bearer ${token}` } : baseHeaders
    res = await fetch(`${API}${path}`, { headers, ...options })
  } catch (e) {
    try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Error de red' })) } catch {}
    throw e
  }
  if (!res.ok) {
    let msg = 'Error'
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      try {
        const data = await res.json()
        msg = typeof data === 'string' ? data : (data.error || JSON.stringify(data))
      } catch {
        msg = await res.text()
      }
    } else {
      msg = await res.text()
    }
    try { window.dispatchEvent(new CustomEvent('app-error', { detail: msg })) } catch {}
    throw new Error(msg)
  }
  return res.json()
}

function IconVentas() {
  return (
    <svg className="icon" viewBox="0 0 24 24"><path d="M3 6h18v2H3zm2 5h14v2H5zm3 5h8v2H8z"/></svg>
  )
}

function IconProductos() {
  return (
    <svg className="icon" viewBox="0 0 24 24"><path d="M4 4h9v7H4zm7 9h9v7h-9zM15 4h5v5h-5zM4 13h5v7H4z"/></svg>
  )
}

function IconClientes() {
  return (
    <svg className="icon" viewBox="0 0 24 24"><path d="M12 6a4 4 0 110 8 4 4 0 010-8zm-8 12a8 8 0 0116 0H4z"/></svg>
  )
}

function IconConfig() {
  return (
    <svg className="icon" viewBox="0 0 24 24"><path d="M12 8a4 4 0 100 8 4 4 0 000-8zm9 4l-2.2.4a7 7 0 00-.7 1.7l1.3 1.9-2 2-1.9-1.3a7 7 0 00-1.7.7L16 21h-4l-.4-2.2a7 7 0 00-1.7-.7l-1.9 1.3-2-2 1.3-1.9a7 7 0 00-.7-1.7L3 12l2.2-.4a7 7 0 00.7-1.7L4.6 8l2-2 1.9 1.3c.6-.3 1.1-.5 1.7-.7L12 3h4l.4 2.2c.6.2 1.2.4 1.7.7L20 4.6l2 2-1.3 1.9c.3.6.5 1.1.7 1.7L21 12z"/></svg>
  )
}

function IconReportes() {
  return (
    <svg className="icon" viewBox="0 0 24 24"><path d="M4 4h16v2H4zM6 8h12v2H6zM8 12h8v2H8zM10 16h4v2h-4z"/></svg>
  )
}

function IconInfo() {
  return (
    <svg className="icon" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20zm1 7h-2V7h2v2zm-2 3h2v6h-2v-6z"/></svg>
  )
}

function Toolbar({ tab, setTab, onToggleTheme, dark, brandName, logoSrc, cashOpen, cashEstimate, onRefreshCash, themeProfiles, themeProfileSel, onApplyThemeProfile, onDuplicateThemeProfile, onRenameThemeProfile, onDeleteThemeProfile }) {
  const tabs = [
    ['ventas', 'Ventas'],
    ['productos', 'Productos'],
    ['clientes', 'Clientes'],
    ['reportes', 'Reportes'],
    ['config', 'Configuración'],
  ]
  const [lastMenuOpen, setLastMenuOpen] = useState(false)
  const [lastRenameVal, setLastRenameVal] = useState('')
  const lastMenuRef = useRef(null)
  const [lastMenuAnim, setLastMenuAnim] = useState(false)
  const [lastPulse, setLastPulse] = useState(false)
  useEffect(() => {
    if (!lastMenuOpen) return
    const onDown = (e) => { try { if (lastMenuRef.current && !lastMenuRef.current.contains(e.target)) setLastMenuOpen(false) } catch {} }
    const onKey = (e) => { try { if (e.key === 'Escape') setLastMenuOpen(false) } catch {} }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [lastMenuOpen])
  useEffect(() => { if (lastMenuOpen) { const t = setTimeout(() => setLastMenuAnim(true), 0); return () => { clearTimeout(t); setLastMenuAnim(false) } } else { setLastMenuAnim(false) } }, [lastMenuOpen])
  return (
    <div className="toolbar">
      <div className="brand">{logoSrc ? <img className="logo" src={logoSrc} alt="logo" /> : <svg className="logo" viewBox="0 0 24 24"><path d="M4 6h16v2H4zm2 4h12v2H6zm3 4h6v2H9z"/></svg>}{brandName || 'Punto de Venta'}</div>
      <div className="spacer" />
      {tabs.map(([key, label]) => (
        <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)} title={label}>
          {key === 'ventas' && <IconVentas />}
          {key === 'productos' && <IconProductos />}
          {key === 'clientes' && <IconClientes />}
          {key === 'config' && <IconConfig />}
          {key === 'reportes' && <IconReportes />}
          <span style={{ marginLeft: 6 }}>{label}</span>
        </button>
      ))}
      <div className="actions">
        {(() => { const names = Object.keys(themeProfiles || {}); if (names.length === 0) return null; const last = localStorage.getItem('last-theme-profile') || ''; return (
          <div style={{ display: 'contents' }}>
            <select value={themeProfileSel} onChange={e => onApplyThemeProfile(e.target.value)} title="Cambiar tema rápido" style={{ maxWidth: 160 }}>
              <option value="">Tema rápido</option>
              {names.map(n => (<option key={n} value={n}>{n}</option>))}
            </select>
            {last && names.includes(last) && (() => { const prof = (themeProfiles || {})[last] || {}; const hex = (h) => { const m = String(h).replace('#',''); const r = parseInt(m.slice(0,2),16)||0; const g = parseInt(m.slice(2,4),16)||0; const b = parseInt(m.slice(4,6),16)||0; return { r, g, b } }; const c = hex(prof.theme_primary || ''); const fg = (() => { if (!prof.theme_primary) return '#fff'; const y = (c.r*299 + c.g*587 + c.b*114)/1000; return y > 150 ? '#111' : '#fff' })(); const bg = prof.theme_primary || 'var(--primary)'; const acc = prof.theme_accent || ''; return (
              <div style={{ position: 'relative', display: 'inline-block' }} ref={lastMenuRef}>
                <button className="btn" style={{ padding: '6px 10px', background: bg, color: fg, border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, transition: 'transform 180ms ease, box-shadow 180ms ease', transform: lastPulse ? 'scale(1.03)' : 'none', boxShadow: lastPulse ? '0 0 0 6px rgba(2, 6, 23, 0.06)' : 'none' }} onClick={() => { if (lastMenuOpen) { setLastMenuOpen(false) } else { setLastRenameVal(last); setLastMenuOpen(true) } }} title={`Acciones del último tema: ${last}`}>
                  <span style={{ width: 12, height: 12, background: acc || '#e53935', borderRadius: 3, border: '1px solid var(--border)' }} />
                  Último: {last}
                </button>
                {lastMenuOpen && (
                  <div className="card" style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 300, padding: 8, minWidth: 220, opacity: lastMenuAnim ? 1 : 0, transform: lastMenuAnim ? 'scale(1)' : 'scale(0.98) translateY(-4px)', transition: 'opacity 140ms ease, transform 140ms ease' }}>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <button className="btn" onClick={() => { onApplyThemeProfile(last); setLastPulse(true); setTimeout(() => setLastPulse(false), 220); setLastMenuOpen(false) }} title="Aplicar">Aplicar</button>
                      <button className="btn btn-ghost" onClick={() => { onDuplicateThemeProfile(last); setLastMenuOpen(false) }} title="Duplicar">Duplicar</button>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input value={lastRenameVal} onChange={e => setLastRenameVal(e.target.value)} style={{ flex: 1 }} title="Nuevo nombre" />
                        <button className="btn btn-ghost" onClick={() => { const nn = (lastRenameVal || '').trim(); if (!nn) return; onRenameThemeProfile(last, nn); setLastMenuOpen(false) }} title="Renombrar">Renombrar</button>
                      </div>
                      <button className="btn btn-ghost" onClick={() => { onDeleteThemeProfile(last); setLastMenuOpen(false) }} title="Eliminar">Eliminar</button>
                      <button className="btn btn-ghost" onClick={() => setLastMenuOpen(false)} title="Cerrar">Cerrar</button>
                    </div>
                    </div>
                )}
              </div>
            ) })()}
          </div>
        ) })()}
        <span style={{ marginRight: 8, padding: '4px 8px', borderRadius: 8, background: cashOpen ? 'var(--accent, #e53935)' : '#eee', color: cashOpen ? '#fff' : '#333' }} title="Estado de caja y saldo estimado">{cashOpen ? `Caja abierta${typeof cashEstimate === 'number' ? ` · ${cashEstimate.toLocaleString(undefined, { style: 'currency', currency: 'MXN' })}` : ''}` : 'Caja cerrada'}</span>
        <button className="btn" onClick={onRefreshCash} title="Actualizar estado de caja">Refrescar caja</button>
        <button className="btn" onClick={onToggleTheme} title="Alternar tema claro/oscuro">{dark ? 'Claro' : 'Oscuro'}</button>
      </div>
    </div>
  )
}

function Reportes() {
  const [range, setRange] = useState('todo')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [summary, setSummary] = useState({ count: 0, total: 0 })
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [currency, setCurrency] = useState('MXN')
  const [last, setLast] = useState({ from: null, to: null })
  const [sales, setSales] = useState([])
  const [customersFull, setCustomersFull] = useState([])
  const [filterMethod, setFilterMethod] = useState('')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [totalsByMethod, setTotalsByMethod] = useState({})
  const [totalsLoading, setTotalsLoading] = useState(false)
  const [recentRange, setRecentRange] = useState('todo')
  const [recentFrom, setRecentFrom] = useState('')
  const [recentTo, setRecentTo] = useState('')
  const [creditSaleIds, setCreditSaleIds] = useState({})
  const [onlyCredit, setOnlyCredit] = useState(false)
  const [payModalId, setPayModalId] = useState(null)
  const [payModalData, setPayModalData] = useState(null)
  const [payModalLoading, setPayModalLoading] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [resetConfirmSkip, setResetConfirmSkip] = useState(false)
  const [sortKey, setSortKey] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [reportsAskConfirm, setReportsAskConfirm] = useState(true)
  const showHelp = (() => { try { return localStorage.getItem('config-help-mode') !== '0' } catch { return true } })()
  useEffect(() => {
    try {
      const k = localStorage.getItem('report-sort-key') || ''
      const d = localStorage.getItem('report-sort-dir') || ''
      if (k) setSortKey(k)
      if (d === 'asc' || d === 'desc') setSortDir(d)
    } catch {}
  }, [])
  useEffect(() => {
    try { setReportsAskConfirm(localStorage.getItem('report-reset-skip-confirm') !== '1') } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('report-sort-key', sortKey); localStorage.setItem('report-sort-dir', sortDir) } catch {}
  }, [sortKey, sortDir])
  const [businessName, setBusinessName] = useState('')
  const [businessRFC, setBusinessRFC] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [logoDataUrl, setLogoDataUrl] = useState('')
  const [ticketWidth, setTicketWidth] = useState(80)
  const [logoSize, setLogoSize] = useState(20)
  const [ticketFooter, setTicketFooter] = useState('')
  const [ticketQrDataUrl, setTicketQrDataUrl] = useState('')
  const [ticketQrCaption, setTicketQrCaption] = useState('')
  const [ticketQr2DataUrl, setTicketQr2DataUrl] = useState('')
  const [ticketQr2Caption, setTicketQr2Caption] = useState('')
  const [ticketQrSize, setTicketQrSize] = useState(32)
  const [creditTicketShowContact, setCreditTicketShowContact] = useState(true)
  const [creditTicketShowRFC, setCreditTicketShowRFC] = useState(true)
  const [ticketBodySize, setTicketBodySize] = useState(10)

  const openResetConfirm = () => {
    const text = 'Esto restablece filtros, rango, orden y vista reciente. Se limpiará cliente y método, fechas personalizadas y se volverá al rango Todo.'
    if (reportsAskConfirm) {
      setResetConfirmText(text)
      setResetConfirmOpen(true)
    } else {
      resetReportsView()
    }
  }

  const closeResetConfirm = () => { setResetConfirmOpen(false) }

  const resetReportsView = () => {
    setFilterMethod('')
    setFilterCustomer('')
    setOnlyCredit(false)
    setRecentRange('todo')
    setRecentFrom('')
    setRecentTo('')
    setSortKey('date')
    setSortDir('desc')
    setRange('todo')
    try {
      localStorage.setItem('last-demo-range', 'todo')
      localStorage.removeItem('last-demo-from')
      localStorage.removeItem('last-demo-to')
    } catch {}
    load(computeRange('todo'))
    setResetConfirmOpen(false)
    try {
      window.dispatchEvent(new CustomEvent('app-message', { detail: 'Vista de reportes restablecida' }))
    } catch {}
  }
  const [ticketLineGap, setTicketLineGap] = useState(5)
  const [ticketHeaderSize, setTicketHeaderSize] = useState(12)
  const [ticketCompact, setTicketCompact] = useState(false)
  const [dateFmt, setDateFmt] = useState('dd/mm/yyyy')
  const [time24, setTime24] = useState(true)

  useEffect(() => {
    const hOpen = () => { try { openCash() } catch {} }
    const hClose = () => { try { closeCash() } catch {} }
    const hAll = () => { try { exportAllExcel() } catch {} }
    const hFilt = () => { try { exportFilteredSalesExcel() } catch {} }
    window.addEventListener('reportes-open-cash', hOpen)
    window.addEventListener('reportes-close-cash', hClose)
    window.addEventListener('reportes-export-all-excel', hAll)
    window.addEventListener('reportes-export-filtered-excel', hFilt)
    return () => {
      window.removeEventListener('reportes-open-cash', hOpen)
      window.removeEventListener('reportes-close-cash', hClose)
      window.removeEventListener('reportes-export-all-excel', hAll)
      window.removeEventListener('reportes-export-filtered-excel', hFilt)
    }
  }, [])

  useEffect(() => { api('/settings').then(s => { setCurrency(s.currency || 'MXN'); setBusinessName(s.business_name || ''); setBusinessRFC(s.business_rfc || ''); setBusinessPhone(s.business_phone || ''); setBusinessEmail(s.business_email || ''); setBusinessAddress(s.business_address || ''); setLogoDataUrl(s.logo_data_url || ''); setTicketWidth(parseInt(s.ticket_width || '80')); setLogoSize(parseInt(s.ticket_logo_size_mm || '20')); setTicketFooter(s.ticket_footer || ''); setTicketQrDataUrl(s.ticket_qr_data_url || ''); setTicketQrCaption(s.ticket_qr_caption || ''); setCreditTicketShowContact(String(s.credit_ticket_show_contact || '1') === '1'); setCreditTicketShowRFC(String(s.credit_ticket_show_rfc || '1') === '1'); setTicketBodySize(parseInt(s.ticket_font_body_size || '10')); setTicketLineGap(parseInt(s.ticket_line_gap_mm || '5')); setTicketHeaderSize(parseInt(s.ticket_font_header_size || '12')); setTicketCompact(String(s.ticket_compact_mode || '0') === '1'); setDateFmt(s.date_format || 'dd/mm/yyyy'); setTime24(String(s.time_24h || '1') === '1') }) }, [])
  const fmt = useMemo(() => new Intl.NumberFormat(undefined, { style: 'currency', currency }), [currency])
  const formatDate = (iso, includeTime = true) => {
    if (!iso) return ''
    const d = new Date(iso)
    const pad = (n) => String(n).padStart(2, '0')
    const dd = pad(d.getDate())
    const mm = pad(d.getMonth() + 1)
    const yyyy = d.getFullYear()
    const hh = pad(d.getHours())
    const mi = pad(d.getMinutes())
    const dfmt = (dateFmt === 'mm/dd/yyyy') ? `${mm}/${dd}/${yyyy}` : (dateFmt === 'yyyy-mm-dd') ? `${yyyy}-${mm}-${dd}` : `${dd}/${mm}/${yyyy}`
    if (!includeTime) return dfmt
    const is24 = !!time24
    if (is24) return `${dfmt} ${hh}:${mi}`
    const h12 = d.getHours() % 12 || 12
    const ampm = d.getHours() < 12 ? 'AM' : 'PM'
    return `${dfmt} ${h12}:${mi} ${ampm}`
  }
  const formatTime = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    const pad = (n) => String(n).padStart(2, '0')
    const hh = pad(d.getHours())
    const mi = pad(d.getMinutes())
    if (time24) return `${hh}:${mi}`
    const h12 = d.getHours() % 12 || 12
    const ampm = d.getHours() < 12 ? 'AM' : 'PM'
    return `${h12}:${mi} ${ampm}`
  }

  const computeRange = (preset) => {
    const now = new Date()
    if (preset === 'hoy') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return { from: start.toISOString(), to: now.toISOString() }
    }
    if (preset === 'semana') {
      const start = new Date(now)
      start.setDate(start.getDate() - 7)
      return { from: start.toISOString(), to: now.toISOString() }
    }
    if (preset === 'mes') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: start.toISOString(), to: now.toISOString() }
    }
    if (preset === 'todo') {
      return { from: new Date('1970-01-01').toISOString(), to: now.toISOString() }
    }
    return {}
  }

  const load = async (opts = {}) => {
    const p = new URLSearchParams()
    if (opts.from) p.set('from', opts.from)
    if (opts.to) p.set('to', opts.to)
    const qs = p.toString()
    const base = qs ? `?${qs}` : ''
    setLast({ from: opts.from || null, to: opts.to || null })
    const s = await api(`/reports/summary${base}`)
    setSummary({ count: s.count || 0, total: s.total || 0 })
    setProducts(await api(`/reports/products${base}`))
    setCustomers(await api(`/reports/customers${base}`))
    const list = await api('/sales')
    const filtered = list.filter(x => {
      if (!opts.from || !opts.to) return true
      const t = new Date(x.created_at).toISOString()
      return t >= opts.from && t <= opts.to
    })
    setSales(filtered)
    try { setCustomersFull(await api('/customers')) } catch {}
  }

  useEffect(() => {
    const r = localStorage.getItem('last-demo-range') || 'todo'
    if (r === 'custom') {
      const f = localStorage.getItem('last-demo-from') || ''
      const t = localStorage.getItem('last-demo-to') || ''
      if (f || t) {
        setRange('custom')
        setFromDate(f ? f.slice(0, 10) : '')
        setToDate(t ? t.slice(0, 10) : '')
        load({ from: f || undefined, to: t || undefined })
        return
      }
    }
    setRange(r)
    load(computeRange(r))
  }, [])

  const downloadCsv = (rows, headers, filename) => {
    const cols = Object.keys(headers)
    const head = cols.map(k => headers[k]).join(',')
    const body = rows.map(r => cols.map(k => {
      const v = r[k]
      if (v == null) return ''
      const s = String(v)
      const needsQuote = s.includes(',') || s.includes('\n') || s.includes('"')
      const t = s.replace(/"/g, '""')
      return needsQuote ? `"${t}"` : t
    }).join(',')).join('\n')
    const csv = head + '\n' + body
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const csvName = (base) => {
    const fmt = (iso) => {
      const d = new Date(iso)
      const y = d.getFullYear()
      const m = String(d.getMonth()+1).padStart(2,'0')
      const day = String(d.getDate()).padStart(2,'0')
      return `${y}-${m}-${day}`
    }
    const suffix = (last.from && last.to) ? `${fmt(last.from)}_a_${fmt(last.to)}` : range
    return `${base}_${suffix}.csv`
  }

  const exportCustomers = () => downloadCsv(customers, { name: 'Cliente', count: 'Ventas', total: 'Total' }, csvName('clientes'))
  const exportProducts = () => downloadCsv(products, { product_id: 'ID', name: 'Producto', qty: 'Cantidad', total: 'Total' }, csvName('productos'))
  const exportSummary = () => downloadCsv([{ count: summary.count, total: summary.total }], { count: 'Ventas', total: 'Total' }, csvName('resumen'))
  const exportAll = () => { exportSummary(); exportCustomers(); exportProducts() }
  const exportAllExcel = async () => {
    try {
      let html = '<html><head><meta charset="utf-8" /><style>table{border-collapse:collapse}td,th{border:1px solid #999;padding:4px}</style></head><body>'
      html += '<h3>Resumen</h3>'
      html += '<table><thead><tr><th>Ventas</th><th>Total</th></tr></thead><tbody>'
      html += `<tr><td>${summary.count}</td><td>${summary.total || 0}</td></tr>`
      html += '</tbody></table>'
      if (Array.isArray(customers) && customers.length) {
        html += '<h3>Por cliente</h3>'
        html += '<table><thead><tr><th>Cliente</th><th>Ventas</th><th>Total</th></tr></thead><tbody>'
        html += customers.map(c => `<tr><td>${(c.name || 'Sin cliente')}</td><td>${c.count}</td><td>${c.total || 0}</td></tr>`).join('')
        html += '</tbody></table>'
      }
      if (Array.isArray(products) && products.length) {
        html += '<h3>Por producto</h3>'
        html += '<table><thead><tr><th>ID</th><th>Producto</th><th>Cant</th><th>Total</th></tr></thead><tbody>'
        html += products.map(p => `<tr><td>${p.product_id}</td><td>${p.name}</td><td>${p.qty}</td><td>${p.total || 0}</td></tr>`).join('')
        html += '</tbody></table>'
      }
      const acc = {}
      for (const s of sales) {
        try {
          const d = await api(`/sales/${s.id}`)
          if (Array.isArray(d.payments)) {
            for (const p of d.payments) acc[p.method] = (acc[p.method] || 0) + (p.amount || 0)
          } else {
            const m = d.payment_method || s.payment_method || 'cash'
            acc[m] = (acc[m] || 0) + (d.total || s.total || 0)
          }
        } catch {}
      }
      const keys = Object.keys(acc)
      if (keys.length) {
        html += '<h3>Totales por método</h3>'
        html += '<table><thead><tr><th>Método</th><th>Total</th></tr></thead><tbody>'
        html += keys.map(k => `<tr><td>${k}</td><td>${acc[k] || 0}</td></tr>`).join('')
        html += '</tbody></table>'
      }
      if (Array.isArray(sales) && sales.length) {
        html += '<h3>Ventas del rango</h3>'
        html += '<table><thead><tr><th>ID</th><th>Fecha</th><th>Cliente</th><th>Método</th><th>Total</th></tr></thead><tbody>'
        html += sales.map(s => {
          const c = customersFull.find(c => String(c.id) === String(s.customer_id))
          const name = c?.name || (s.customer_id || '-')
          return `<tr><td>${s.id}</td><td>${s.created_at}</td><td>${name}</td><td>${s.payment_method || '-'}</td><td>${s.total || 0}</td></tr>`
        }).join('')
        html += '</tbody></table>'
      }
      html += '</body></html>'
      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = csvName('reporte').replace(/\.csv$/, '.xls')
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {}
  }
  const exportSalesDetail = async () => {
    try {
      const s = await api('/sales')
      const inRange = s.filter(x => {
        if (!last.from || !last.to) return true
        const t = new Date(x.created_at).toISOString()
        return t >= last.from && t <= last.to
      })
      const rows = []
      for (const x of inRange) {
        const d = await api(`/sales/${x.id}`)
        const pagos = Array.isArray(d.payments) ? d.payments.map(p => `${p.method}:${p.amount}`).join('; ') : ''
        const items = Array.isArray(d.items) ? d.items.map(it => `${it.quantity}x ${it.product_name} @ ${it.unit_price}`).join('; ') : ''
        rows.push({ id: d.id, fecha: d.created_at, cliente: d.customer_name || '', cliente_id: d.customer_id || '', subtotal: d.subtotal, iva: d.tax, descuento: d.discount, total: d.total, pagos, items })
      }
      downloadCsv(rows, { id: 'ID', fecha: 'Fecha', cliente: 'Cliente', cliente_id: 'Cliente ID', subtotal: 'Subtotal', iva: 'IVA', descuento: 'Descuento', total: 'Total', pagos: 'Pagos', items: 'Ítems' }, csvName('ventas_detalle'))
    } catch (e) {}
  }

  const fmtMoney = useMemo(() => new Intl.NumberFormat(undefined, { style: 'currency', currency }), [currency])
  const filteredSales = useMemo(() => {
    let bounds = { from: null, to: null }
    if (recentRange === 'custom') {
      const f = recentFrom ? new Date(recentFrom + 'T00:00:00').toISOString() : null
      const t = recentTo ? new Date(recentTo + 'T23:59:59').toISOString() : null
      bounds = { from: f, to: t }
    } else {
      const r = (() => {
        const now = new Date()
        if (recentRange === 'hoy') { const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); return { from: start.toISOString(), to: now.toISOString() } }
        if (recentRange === 'semana') { const start = new Date(now); start.setDate(start.getDate() - 7); return { from: start.toISOString(), to: now.toISOString() } }
        if (recentRange === 'mes') { const start = new Date(now.getFullYear(), now.getMonth(), 1); return { from: start.toISOString(), to: now.toISOString() } }
        return { from: null, to: null }
      })()
      bounds = r
    }
    return sales.filter(s => {
      if (bounds.from && bounds.to) {
        const t = new Date(s.created_at).toISOString()
        if (!(t >= bounds.from && t <= bounds.to)) return false
      }
      if (filterMethod && s.payment_method !== filterMethod) return false
      const q = filterCustomer.trim().toLowerCase()
      if (!q) return true
      const c = customersFull.find(c => String(c.id) === String(s.customer_id))
      const name = c?.name?.toLowerCase() || ''
      return String(s.customer_id || '').toLowerCase().includes(q) || name.includes(q)
    })
  }, [sales, filterMethod, filterCustomer, customersFull, recentRange, recentFrom, recentTo])
  const filteredSalesFinal = useMemo(() => {
    if (!onlyCredit) return filteredSales
    return filteredSales.filter(s => !!creditSaleIds[s.id])
  }, [filteredSales, onlyCredit, creditSaleIds])
  const sortedSalesFinal = useMemo(() => {
    const arr = [...filteredSalesFinal]
    const cmp = (a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'date' || sortKey === 'time') {
        const ta = new Date(a.created_at).getTime()
        const tb = new Date(b.created_at).getTime()
        return (ta - tb) * mul
      }
      if (sortKey === 'total') return ((a.total || 0) - (b.total || 0)) * mul
      if (sortKey === 'id') return ((a.id || 0) - (b.id || 0)) * mul
      if (sortKey === 'customer') {
        const na = (() => { const c = customersFull.find(c => String(c.id) === String(a.customer_id)); return c?.name || (a.customer_id || '') })()
        const nb = (() => { const c = customersFull.find(c => String(c.id) === String(b.customer_id)); return c?.name || (b.customer_id || '') })()
        return na.localeCompare(nb) * mul
      }
      if (sortKey === 'method') return String(a.payment_method || '').localeCompare(String(b.payment_method || '')) * mul
      return 0
    }
    arr.sort(cmp)
    return arr
  }, [filteredSalesFinal, sortKey, sortDir, customersFull])
  const onSort = (k) => { if (sortKey === k) { setSortDir(sortDir === 'asc' ? 'desc' : 'asc') } else { setSortKey(k); setSortDir(k === 'date' || k === 'time' || k === 'total' || k === 'id' ? 'desc' : 'asc') } }
  useEffect(() => { (async () => { try {
    setTotalsLoading(true)
    const acc = {}
    const credits = {}
    for (const s of filteredSales) {
      const d = await api(`/sales/${s.id}`)
      if (Array.isArray(d.payments)) {
        for (const p of d.payments) {
          acc[p.method] = (acc[p.method] || 0) + (p.amount || 0)
          if (String(p.method) === 'credit' && (p.amount || 0) > 0) credits[s.id] = true
        }
      } else {
        acc[s.payment_method || 'cash'] = (acc[s.payment_method || 'cash'] || 0) + (d.total || s.total || 0)
        if (String(d.payment_method || s.payment_method) === 'credit') credits[s.id] = true
      }
    }
    setTotalsByMethod(acc)
    setCreditSaleIds(credits)
  } catch { setTotalsByMethod({}) } finally { setTotalsLoading(false) } })() }, [filteredSales])
  const exportFilteredSalesDetail = async () => {
    try {
      const rows = []
      for (const s of filteredSales) {
        const d = await api(`/sales/${s.id}`)
        const pagos = Array.isArray(d.payments) ? d.payments.map(p => `${p.method}:${p.amount}`).join('; ') : ''
        const items = Array.isArray(d.items) ? d.items.map(it => `${it.quantity}x ${it.product_name} @ ${it.unit_price}`).join('; ') : ''
        const credito = Array.isArray(d.payments) ? (d.payments.some(p => String(p.method) === 'credit' && (p.amount || 0) > 0) ? 'sí' : 'no') : (String(d.payment_method || s.payment_method) === 'credit' ? 'sí' : 'no')
        rows.push({ id: d.id, fecha: d.created_at, cliente: d.customer_name || '', cliente_id: d.customer_id || '', metodo: d.payment_method || s.payment_method || '', credito, subtotal: d.subtotal, iva: d.tax, descuento: d.discount, total: d.total, pagos, items })
      }
      const headers = { id: 'ID', fecha: 'Fecha', cliente: 'Cliente', cliente_id: 'Cliente ID', metodo: 'Método', credito: 'Crédito', subtotal: 'Subtotal', iva: 'IVA', descuento: 'Descuento', total: 'Total', pagos: 'Pagos', items: 'Ítems' }
      const cols = Object.keys(headers)
      const head = cols.map(k => headers[k]).join(',')
      const body = rows.map(r => cols.map(k => {
        const v = r[k]
        if (v == null) return ''
        const s = String(v)
        const needsQuote = s.includes(',') || s.includes('\n') || s.includes('"')
        const t = s.replace(/"/g, '""')
        return needsQuote ? `"${t}"` : t
      }).join(',')).join('\n')
      const methodKeys = Object.keys(totalsByMethod)
      const lines = []
      lines.push('Totales por método')
      lines.push('Método,Total')
      for (const k of methodKeys) lines.push(`${k},${totalsByMethod[k] || 0}`)
      lines.push('')
      const csv = lines.join('\n') + head + '\n' + body
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = csvName('ventas_filtradas')
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {}
  }
  const exportTotalsByMethod = () => {
    const rows = Object.keys(totalsByMethod).map(k => ({ metodo: k, total: totalsByMethod[k] || 0 }))
    if (rows.length === 0) return
    downloadCsv(rows, { metodo: 'Método', total: 'Total' }, csvName('totales_por_metodo'))
  }
  const exportFilteredSalesExcel = async () => {
    try {
      const headers = ['ID', 'Fecha', 'Cliente', 'Cliente ID', 'Método', 'Crédito', 'Subtotal', 'IVA', 'Descuento', 'Total', 'Pagos', 'Ítems']
      const rows = []
      for (const s of filteredSalesFinal) {
        const d = await api(`/sales/${s.id}`)
        const pagos = Array.isArray(d.payments) ? d.payments.map(p => `${p.method}:${p.amount}`).join('; ') : ''
        const items = Array.isArray(d.items) ? d.items.map(it => `${it.quantity}x ${it.product_name} @ ${it.unit_price}`).join('; ') : ''
        const credito = Array.isArray(d.payments) ? (d.payments.some(p => String(p.method) === 'credit' && (p.amount || 0) > 0) ? 'sí' : 'no') : (String(d.payment_method || s.payment_method) === 'credit' ? 'sí' : 'no')
        rows.push([d.id, d.created_at, d.customer_name || '', d.customer_id || '', d.payment_method || s.payment_method || '', credito, d.subtotal, d.tax, d.discount, d.total, pagos, items])
      }
      let html = '<html><head><meta charset="utf-8" /><style>table{border-collapse:collapse}td,th{border:1px solid #999;padding:4px}</style></head><body>'
      html += '<table><thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>'
      html += rows.map(r => '<tr>' + r.map(v => `<td>${v == null ? '' : String(v).replace(/[<>]/g, c => ({'<':'&lt;','>':'&gt;'}[c]))}</td>`).join('') + '</tr>').join('')
      html += '</tbody></table>'
      const methodKeys = Object.keys(totalsByMethod)
      if (methodKeys.length) {
        html += '<h3>Totales por método</h3>'
        html += '<table><thead><tr><th>Método</th><th>Total</th></tr></thead><tbody>'
        html += methodKeys.map(k => `<tr><td>${k}</td><td>${totalsByMethod[k] || 0}</td></tr>`).join('')
        html += '</tbody></table>'
      }
      if (Array.isArray(customers) && customers.length) {
        html += '<h3>Por cliente</h3>'
        html += '<table><thead><tr><th>Cliente</th><th>Ventas</th><th>Total</th></tr></thead><tbody>'
        html += customers.map(c => `<tr><td>${(c.name || 'Sin cliente')}</td><td>${c.count}</td><td>${c.total || 0}</td></tr>`).join('')
        html += '</tbody></table>'
      }
      if (Array.isArray(products) && products.length) {
        html += '<h3>Por producto</h3>'
        html += '<table><thead><tr><th>ID</th><th>Producto</th><th>Cant</th><th>Total</th></tr></thead><tbody>'
        html += products.map(p => `<tr><td>${p.product_id}</td><td>${p.name}</td><td>${p.qty}</td><td>${p.total || 0}</td></tr>`).join('')
        html += '</tbody></table>'
      }
      html += '</body></html>'
      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = csvName('ventas_filtradas').replace(/\.csv$/, '.xls')
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {}
  }
  const openPayments = async (id) => {
    setPayModalId(id)
    setPayModalLoading(true)
    try { const d = await api(`/sales/${id}`); setPayModalData(d) } catch { setPayModalData(null) } finally { setPayModalLoading(false) }
  }
  const closePayments = () => { setPayModalId(null); setPayModalData(null); setPayModalLoading(false) }
  const reprint = async (id) => {
    try {
      const detail = await api(`/sales/${id}`)
      const doc = new jsPDF({ unit: 'mm', format: [ticketWidth || 80, 240] })
      const pageW = doc.internal.pageSize.getWidth()
      let y = 10
      const gap = ticketCompact ? Math.max(3, ticketLineGap - 2) : ticketLineGap
      if (logoDataUrl) { try { const m = String(logoDataUrl).match(/^data:image\/(png|jpeg|jpg);/i); const fmt = (m?.[1] || 'PNG').toUpperCase().replace('JPG','JPEG'); const w = logoSize || 20; const x = (pageW - w) / 2; doc.addImage(logoDataUrl, fmt, x, y, w, w); y += (w + 2) } catch {} }
      doc.setFontSize(ticketHeaderSize)
      doc.text(businessName || 'PUNTO DE VENTA', pageW / 2, y, { align: 'center' }); y += 6
      doc.setFontSize(ticketBodySize)
      if (businessAddress) { doc.text(String(businessAddress), pageW / 2, y, { align: 'center' }); y += gap }
      if (businessPhone) { doc.text(String(businessPhone), pageW / 2, y, { align: 'center' }); y += gap }
      if (businessEmail) { doc.text(String(businessEmail), pageW / 2, y, { align: 'center' }); y += gap }
      if (businessRFC) { doc.text(`RFC: ${businessRFC}`, pageW / 2, y, { align: 'center' }); y += gap }
      doc.text(`Ticket #${detail.id}`, pageW / 2, y, { align: 'center' }); y += gap
      doc.text(formatDate(detail.created_at), pageW / 2, y, { align: 'center' }); y += gap
      if (Array.isArray(detail.payments) && detail.payments.some(p => String(p.method) === 'credit' && (p.amount || 0) > 0)) {
        if (detail.customer_name) { doc.text(`Cliente: ${detail.customer_name}`, pageW / 2, y, { align: 'center' }); y += gap }
        if (creditTicketShowRFC && detail.customer_rfc) { doc.text(`RFC: ${detail.customer_rfc}`, pageW / 2, y, { align: 'center' }); y += gap }
        if (creditTicketShowContact) {
          if (detail.customer_phone) { doc.text(`Tel: ${detail.customer_phone}`, pageW / 2, y, { align: 'center' }); y += gap }
          if (detail.customer_email) { doc.text(String(detail.customer_email), pageW / 2, y, { align: 'center' }); y += gap }
        }
      }
      doc.line(8, y, pageW - 8, y); y += 4
      doc.setFontSize(ticketBodySize)
      doc.text('Cant', 10, y)
      doc.text('Producto', 26, y)
      doc.text('P.Unit', pageW - 28, y, { align: 'right' })
      doc.text('Importe', pageW - 8, y, { align: 'right' }); y += 5
      doc.line(8, y, pageW - 8, y); y += 4
      const maxDesc = (ticketWidth || 80) <= 58 ? 16 : 24
      for (const it of detail.items) {
        const desc = String(it.product_name || `#${it.product_id}`).slice(0, maxDesc)
        doc.text(String(it.quantity), 10, y)
        doc.text(desc, 26, y)
        doc.text(fmtMoney.format(it.unit_price), pageW - 28, y, { align: 'right' })
        doc.text(fmtMoney.format(it.line_total), pageW - 8, y, { align: 'right' })
        y += gap
      }
      doc.line(8, y, pageW - 8, y); y += 4
      doc.text(`Subtotal: ${fmtMoney.format(detail.subtotal)}`, pageW - 8, y, { align: 'right' }); y += gap
      doc.text(`IVA: ${fmtMoney.format(detail.tax)}`, pageW - 8, y, { align: 'right' }); y += gap
      if (detail.discount) { doc.text(`Descuento: ${fmtMoney.format(detail.discount)}`, pageW - 8, y, { align: 'right' }); y += gap }
      doc.setFontSize(ticketHeaderSize)
      doc.text(`TOTAL: ${fmtMoney.format(detail.total)}`, pageW - 8, y, { align: 'right' }); y += 8
      if (Array.isArray(detail.payments) && detail.payments.some(p => String(p.method) === 'credit' && (p.amount || 0) > 0)) { doc.setFontSize(ticketBodySize); doc.text('CRÉDITO', 10, y); y += gap }
      if (Array.isArray(detail.payments) && detail.payments.length) {
        doc.setFontSize(ticketBodySize)
        doc.line(8, y, pageW - 8, y); y += 4
        doc.text('Pagos', 10, y); y += 5
        let creditAmt = 0
        for (const p of detail.payments) {
          doc.text(String(p.method), 10, y)
          doc.text(fmtMoney.format(p.amount || 0), pageW - 8, y, { align: 'right' })
          y += gap
          if (String(p.method) === 'credit') creditAmt += (p.amount || 0)
        }
        if (creditAmt > 0) { doc.text(`Crédito: ${fmtMoney.format(creditAmt)}`, pageW - 8, y, { align: 'right' }); y += gap; doc.text('Venta con crédito', 10, y); y += 6 }
      }
      if (ticketQrDataUrl) { try { const size = ticketQrSize || ((ticketWidth || 80) <= 58 ? 26 : 32); const x = (pageW - size) / 2; doc.addImage(ticketQrDataUrl, 'PNG', x, y, size, size); y += (size + 4); if (ticketQrCaption) { doc.setFontSize(ticketBodySize); doc.text(String(ticketQrCaption), pageW / 2, y, { align: 'center' }); y += gap } } catch {} }
      if (ticketQr2DataUrl) { try { const size = ticketQrSize || ((ticketWidth || 80) <= 58 ? 26 : 32); const x = (pageW - size) / 2; doc.addImage(ticketQr2DataUrl, 'PNG', x, y, size, size); y += (size + 4); if (ticketQr2Caption) { doc.setFontSize(ticketBodySize); doc.text(String(ticketQr2Caption), pageW / 2, y, { align: 'center' }); y += gap } } catch {} }
      if (ticketFooter) { doc.setFontSize(9); const lines = doc.splitTextToSize(String(ticketFooter), pageW - 16); doc.text(lines, pageW / 2, y, { align: 'center' }) }
      doc.save(`ticket_${detail.id}.pdf`)
    } catch {}
  }
  const removeSale = async (id) => { if (!window.confirm(`Eliminar venta #${id}? Esto revertirá stock y movimientos asociados.`)) return; try { await api(`/sales/${id}`, { method: 'DELETE' }); await load(last.from && last.to ? { from: last.from, to: last.to } : computeRange(range)); try { window.dispatchEvent(new CustomEvent('app-message', { detail: `Venta #${id} eliminada` })) } catch {} } catch (e) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: String(e?.message || 'Error al eliminar') })) } catch {} } }

  const [cashSession, setCashSession] = useState(null)
  const [cashMovements, setCashMovements] = useState([])
  const [cashLoading, setCashLoading] = useState(false)
  const [cashError, setCashError] = useState('')
  const [openingBalance, setOpeningBalance] = useState('0')
  const [withdrawAmount, setWithdrawAmount] = useState('0')
  const [depositAmount, setDepositAmount] = useState('0')

  const loadCash = async () => {
    setCashLoading(true)
    setCashError('')
    try {
      const st = await api('/cash/status')
      setCashSession(st.session || null)
      if (st.session) {
        try { setCashMovements(await api('/cash/movements')) } catch { setCashMovements([]) }
      } else {
        setCashMovements([])
      }
    } catch (e) {
      setCashError('No autenticado')
      setCashSession(null)
      setCashMovements([])
    } finally {
      setCashLoading(false)
    }
  }
  useEffect(() => { loadCash() }, [])
  const openCash = async () => { try { await api('/cash/open', { method: 'POST', body: JSON.stringify({ opening_balance: +parseFloat(openingBalance || '0') }) }); await loadCash(); try { window.dispatchEvent(new CustomEvent('app-message', { detail: 'Caja abierta' })) } catch {}; try { window.dispatchEvent(new CustomEvent('cash-status', { detail: { open: true } })) } catch {} } catch {} }
  const closeCash = async () => { try { await api('/cash/close', { method: 'POST' }); await loadCash(); try { window.dispatchEvent(new CustomEvent('app-message', { detail: 'Caja cerrada' })) } catch {}; try { window.dispatchEvent(new CustomEvent('cash-status', { detail: { open: false } })) } catch {} } catch {} }
  const withdrawCash = async () => { const amt = +parseFloat(withdrawAmount || '0'); if (!(amt > 0)) return; try { await api('/cash/withdraw', { method: 'POST', body: JSON.stringify({ amount: amt, reference: 'Retiro manual' }) }); setWithdrawAmount('0'); await loadCash(); try { window.dispatchEvent(new CustomEvent('cash-status', { detail: { open: true } })) } catch {} } catch {} }
  const depositCash = async () => { const amt = +parseFloat(depositAmount || '0'); if (!(amt > 0)) return; try { await api('/cash/deposit', { method: 'POST', body: JSON.stringify({ amount: amt, reference: 'Depósito manual' }) }); setDepositAmount('0'); await loadCash(); try { window.dispatchEvent(new CustomEvent('cash-status', { detail: { open: true } })) } catch {} } catch {} }

  return (
    <div className="container view">
      <h2>Reportes</h2>
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
        <button className="btn btn-ghost" title="Guía de reportes" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Ayuda de Reportes', text: 'Genera resúmenes y exporta ventas a Excel. Usa filtros de fecha y cliente para delimitar. Atajos: Alt+O abre caja, Alt+C cierra caja, Alt+X exporta todo, Alt+F exporta lo filtrado.' } })) } catch {} }}>Ayuda</button>
      </div>
      <div className="card" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, justifyContent: 'space-between' }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={range} onChange={e => { const v = e.target.value; setRange(v); localStorage.setItem('last-demo-range', v); if (v !== 'custom') { localStorage.removeItem('last-demo-from'); localStorage.removeItem('last-demo-to'); } load(computeRange(v)) }} title="Selecciona el rango de fechas">
              <option value="todo">Todo</option>
              <option value="hoy">Hoy</option>
              <option value="semana">7 días</option>
              <option value="mes">Mes actual</option>
              <option value="custom">Personalizado</option>
            </select>
        {showHelp && <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Cómo filtrar por fecha" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Filtros de fecha', text: 'Elige un rango predefinido o personaliza con fechas Desde/Hasta y presiona Aplicar.' } })) } catch {} }}><IconInfo /></button>}
            {range === 'custom' && (
              <>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} title="Fecha inicio" />
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} title="Fecha fin" />
                <button className="btn" title="Aplicar filtro por fechas" onClick={() => {
                  const f = fromDate ? new Date(fromDate + 'T00:00:00').toISOString() : undefined
                  const t = toDate ? new Date(toDate + 'T23:59:59').toISOString() : undefined
                  localStorage.setItem('last-demo-range', 'custom')
                  localStorage.setItem('last-demo-from', f || '')
                  localStorage.setItem('last-demo-to', t || '')
                  load({ from: f, to: t })
                }}>Aplicar</button>
              </>
            )}
          </div>
          {(() => { const f = last?.from; const t = last?.to; if (!f || !t) return null; const fmt = (iso, showTime) => { const d = new Date(iso); const pad = (n) => String(n).padStart(2, '0'); const dd = pad(d.getDate()); const mm = pad(d.getMonth() + 1); const yyyy = d.getFullYear(); const hh = pad(d.getHours()); const mi = pad(d.getMinutes()); const dateStr = (dateFmt === 'mm/dd/yyyy') ? `${mm}/${dd}/${yyyy}` : (dateFmt === 'yyyy-mm-dd') ? `${yyyy}-${mm}-${dd}` : `${dd}/${mm}/${yyyy}`; if (!showTime) return dateStr; if (time24) return `${dateStr} ${hh}:${mi}`; const h12 = d.getHours() % 12 || 12; const ampm = d.getHours() < 12 ? 'AM' : 'PM'; return `${dateStr} ${h12}:${mi} ${ampm}` }; const df = fmt(f, range === 'hoy'); const dt = fmt(t, range === 'hoy'); const label = (range === 'hoy' ? 'Hoy' : range === 'semana' ? '7 días' : range === 'mes' ? 'Mes actual' : range === 'custom' ? 'Personalizado' : 'Todo'); return (<div className="muted">Rango aplicado: {label} · {df} – {dt}</div>) })()}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={exportAll} title="Exporta CSV de resumen, clientes y productos">Exportar todo</button>
          <button className="btn" onClick={exportAllExcel} title="Exporta todo en formato Excel">Exportar todo (Excel)</button>
          <button className="btn" onClick={exportSalesDetail} title="Exporta detalle de cada venta">Exportar ventas (detalle)</button>
          {showHelp && <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Ayuda de exportación" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Exportación', text: 'Usa Exportar todo para un resumen general. Exportar ventas (detalle) incluye ítems y pagos por venta.' } })) } catch {} }}><IconInfo /></button>}
          <button className="btn" onClick={openResetConfirm} title="Limpiar filtros, rango y orden" style={{ background: 'var(--accent, #e53935)', color: '#fff' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 3 L3 21 H21 Z" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
                <path d="M12 9 V14" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="17" r="1.5" fill="#fff" />
              </svg>
              <span>Restablecer vista</span>
            </span>
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="card">
          <h4>Resumen</h4>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={exportSummary} title="Exportar resumen como CSV">Exportar CSV</button>
          </div>
          <div style={{ marginTop: 8 }}>
            <div>Ventas: {summary.count}</div>
            <div>Total: {fmt.format(summary.total || 0)}</div>
          </div>
        </div>
        <div className="card">
          <h4>Por cliente</h4>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={exportCustomers} title="Exportar tabla de clientes como CSV">Exportar CSV</button>
          </div>
          <table className="table" style={{ marginTop: 8 }}>
            <thead><tr><th>Cliente</th><th className="right">Ventas</th><th className="right">Total</th></tr></thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.customer_id || 'nc'}>
                  <td>{c.name || 'Sin cliente'}</td>
                  <td className="right">{c.count}</td>
                  <td className="right">{fmt.format(c.total || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <h4>Por producto</h4>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={exportProducts}>Exportar CSV</button>
        </div>
        <table className="table" style={{ marginTop: 8 }}>
          <thead><tr><th>ID</th><th>Producto</th><th className="right">Cant</th><th className="right">Total</th></tr></thead>
          <tbody>
            {products.map(p => (
              <tr key={p.product_id}>
                <td>{p.product_id}</td>
                <td>{p.name}</td>
                <td className="right">{p.qty}</td>
                <td className="right">{fmt.format(p.total || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <h4>Caja</h4>
        {showHelp && <button className="btn btn-ghost" style={{ padding: '6px 10px', marginTop: 6 }} title="Ayuda de caja" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Caja', text: 'Abre una sesión de caja para registrar depósitos, retiros y ventas en efectivo. Puedes cerrar la caja desde aquí o con Alt+C en esta pestaña.' } })) } catch {} }}><IconInfo /></button>}
        {cashLoading && <div className="muted">Cargando...</div>}
        {!cashLoading && cashError && <div className="accent">{cashError}</div>}
        {!cashLoading && !cashError && !cashSession && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input placeholder="Saldo inicial" type="number" step="0.01" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} style={{ maxWidth: 160 }} title="Monto inicial de la caja" />
            <button className="btn" onClick={openCash} title="Abrir sesión de caja">Abrir caja</button>
          </div>
        )}
        {!cashLoading && !cashError && cashSession && (
          <div>
            <div className="muted">Abierta: {formatDate(cashSession.opened_at)} · Inicial: {fmt.format(cashSession.opening_balance || 0)}</div>
            <div className="muted" style={{ marginTop: 6 }}>
              {(() => {
                const sale = cashMovements.filter(m => m.type === 'sale').reduce((s, m) => s + (m.amount || 0), 0)
                const dep = cashMovements.filter(m => m.type === 'deposit').reduce((s, m) => s + (m.amount || 0), 0)
                const ret = cashMovements.filter(m => m.type === 'withdraw').reduce((s, m) => s + (m.amount || 0), 0)
                const est = (cashSession.opening_balance || 0) + sale + dep + ret
                return `Ingresos efectivo: ${fmt.format(sale)} · Depósitos: ${fmt.format(dep)} · Retiros: ${fmt.format(ret)} · Saldo estimado: ${fmt.format(est)}`
              })()}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
              <input placeholder="Depósito" type="number" step="0.01" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} style={{ maxWidth: 140 }} title="Monto a depositar" />
              <button className="btn" onClick={depositCash} title="Registrar depósito">Depositar</button>
              <input placeholder="Retiro" type="number" step="0.01" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} style={{ maxWidth: 140 }} title="Monto a retirar" />
              <button className="btn" onClick={withdrawCash} title="Registrar retiro">Retirar</button>
              <div className="spacer" />
              <button className="btn btn-ghost" onClick={closeCash} title="Cerrar sesión de caja">Cerrar caja</button>
            </div>
            <table className="table" style={{ marginTop: 8 }}>
              <thead><tr><th>Tipo</th><th>Referencia</th><th className="right">Monto</th><th>Fecha</th></tr></thead>
              <tbody>
                {cashMovements.map(m => (
                  <tr key={m.id}><td>{m.type}</td><td>{m.reference || '-'}</td><td className="right">{fmt.format(m.amount || 0)}</td><td>{formatDate(m.created_at)}</td></tr>
                ))}
                {cashMovements.length === 0 && <tr><td colSpan="4">Sin movimientos</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <h4>Ventas recientes</h4>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
          <span className="muted">Rango</span>
          <select value={recentRange} onChange={e => setRecentRange(e.target.value)}>
            <option value="todo">Todo</option>
            <option value="hoy">Hoy</option>
            <option value="semana">7 días</option>
            <option value="mes">Mes actual</option>
            <option value="custom">Personalizado</option>
          </select>
          {recentRange === 'custom' && (
            <>
              <input type="date" value={recentFrom} onChange={e => setRecentFrom(e.target.value)} />
              <input type="date" value={recentTo} onChange={e => setRecentTo(e.target.value)} />
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}>
            <option value="">Todos</option>
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
            <option value="credit">Crédito</option>
          </select>
      <input placeholder="Cliente (ID o nombre)" value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} title="Filtra por cliente" />
          <button className="btn" onClick={exportFilteredSalesDetail}>Exportar filtradas</button>
          <button className="btn" onClick={exportTotalsByMethod}>Exportar totales método</button>
          <button className="btn" onClick={exportFilteredSalesExcel}>Exportar filtradas (Excel)</button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={onlyCredit} onChange={e => setOnlyCredit(e.target.checked)} />Solo crédito</label>
        </div>
        <div className="muted" style={{ marginTop: 6 }}>
          {(() => { const total = filteredSales.reduce((s, x) => s + (x.total || 0), 0); return `Ventas filtradas: ${filteredSales.length} · Total: ${fmtMoney.format(total)}` })()}
        </div>
        <div className="muted" style={{ marginTop: 6 }}>
          {(() => { const keys = Object.keys(totalsByMethod); if (totalsLoading) return 'Calculando...'; if (!keys.length) return 'Sin totales por método'; return keys.map(k => `${k}: ${fmtMoney.format(totalsByMethod[k] || 0)}`).join(' · ') })()}
        </div>
        <table className="table" style={{ marginTop: 8 }}>
          <thead><tr>
            <th style={{ cursor: 'pointer' }} onClick={() => onSort('id')} title="Ordenar por ID">ID {sortKey === 'id' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
            <th style={{ cursor: 'pointer' }} onClick={() => onSort('date')} title="Ordenar por fecha">Fecha {sortKey === 'date' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
            {!time24 && <th className="hide-sm" style={{ cursor: 'pointer' }} onClick={() => onSort('time')} title="Ordenar por hora">Hora {sortKey === 'time' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>}
            <th style={{ cursor: 'pointer' }} onClick={() => onSort('customer')} title="Ordenar por cliente">Cliente {sortKey === 'customer' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
            <th className="hide-sm" style={{ cursor: 'pointer' }} onClick={() => onSort('method')} title="Ordenar por método">Método {sortKey === 'method' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
            <th className="right" style={{ cursor: 'pointer' }} onClick={() => onSort('total')} title="Ordenar por total">Total {sortKey === 'total' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
            <th></th>
          </tr></thead>
          <tbody>
            {sortedSalesFinal.map(s => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>{formatDate(s.created_at)}</td>
                {!time24 && <td className="hide-sm">{formatTime(s.created_at)}</td>}
                <td>{(() => { const c = customersFull.find(c => String(c.id) === String(s.customer_id)); return c?.name || (s.customer_id || '-') })()}</td>
                <td className="hide-sm">{s.payment_method || '-'}{creditSaleIds[s.id] ? <span className="badge badge-accent" style={{ marginLeft: 6 }}>CRÉDITO</span> : null}</td>
                <td className="right">{fmtMoney.format(s.total || 0)}</td>
                <td className="right cell-nowrap">
                  <button className="btn" onClick={() => reprint(s.id)} title="Reimprimir ticket en PDF">Ticket PDF</button>
                  <button className="btn" onClick={() => openPayments(s.id)} title="Ver pagos de la venta">Pagos</button>
                  <button className="btn btn-accent" onClick={() => removeSale(s.id)} title="Eliminar venta">Eliminar</button>
                </td>
              </tr>
            ))}
            {filteredSalesFinal.length === 0 && <tr><td colSpan={(!time24 ? 6 : 5)}>Sin ventas en el rango</td></tr>}
          </tbody>
        </table>
        {payModalId && (
          <div className="modal-overlay" onClick={closePayments}>
            <div className="card modal" onClick={e => e.stopPropagation()}>
              <h3>Pagos venta #{payModalId}</h3>
              {payModalLoading && <div className="muted">Cargando...</div>}
              {!payModalLoading && payModalData && (
                <>
                  <div className="muted">Fecha: {formatDate(payModalData.created_at)}</div>
                  <table className="table" style={{ marginTop: 8 }}>
                    <thead><tr><th>Método</th><th>Usuario</th><th className="right">Monto</th></tr></thead>
                    <tbody>
                      {Array.isArray(payModalData.payments) && payModalData.payments.length > 0 ? payModalData.payments.map((p, i) => (
                        <tr key={i}><td>{p.method}</td><td>{p.username || '-'}</td><td className="right">{fmtMoney.format(p.amount || 0)}</td></tr>
                      )) : <tr><td colSpan="3">Sin pagos</td></tr>}
                    </tbody>
                  </table>
                  <div className="modal-actions">
                    <button className="btn" onClick={closePayments}>Cerrar</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {resetConfirmOpen && (
          <div className="modal-overlay" onClick={closeResetConfirm}>
            <div className="card modal" onClick={e => e.stopPropagation()}>
              <h3>Restablecer vista</h3>
              <div className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M12 3 L3 21 H21 Z" fill="none" stroke="var(--accent, #e53935)" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M12 9 V14" stroke="var(--accent, #e53935)" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="12" cy="17" r="1.5" fill="var(--accent, #e53935)" />
                </svg>
                <div style={{ whiteSpace: 'pre-line' }}>{resetConfirmText}</div>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <input type="checkbox" checked={resetConfirmSkip} onChange={e => setResetConfirmSkip(e.target.checked)} />
                No volver a preguntar
              </label>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={closeResetConfirm}>Cancelar</button>
                <button className="btn" style={{ background: 'var(--accent, #e53935)', color: '#fff' }} onClick={resetReportsView}>Restablecer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Productos() {
  const [list, setList] = useState([])
  const [form, setForm] = useState({ name: '', sku: '', price: 0, stock: 0 })
  const [loading, setLoading] = useState(false)
  const showHelp = (() => { try { return localStorage.getItem('config-help-mode') !== '0' } catch { return true } })()
  const [currency, setCurrency] = useState('MXN')
  const [delProductId, setDelProductId] = useState(null)
  const [delProductName, setDelProductName] = useState('')
  const nameRef = useRef(null)

  useEffect(() => { api('/settings').then(s => setCurrency(s.currency || 'MXN')) }, [])
  const fmt = useMemo(() => new Intl.NumberFormat(undefined, { style: 'currency', currency }), [currency])

  const load = async () => setList(await api('/products'))
  useEffect(() => { load() }, [])

  const save = async () => {
    setLoading(true)
    await api('/products', { method: 'POST', body: JSON.stringify(form) })
    setForm({ name: '', sku: '', price: 0, stock: 0 })
    await load()
    setLoading(false)
  }

  const remove = async (id) => {
    const p = list.find(x => x.id === id)
    setDelProductId(id)
    setDelProductName(p?.name || '')
  }
  const startAddProduct = () => { try { document.getElementById('prod-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); nameRef.current?.focus() } catch {} }

  return (
    <div className="container view">
      <h2>Productos</h2>
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
        <button className="btn" onClick={startAddProduct} title="Agregar un nuevo producto">Agregar producto</button>
        {showHelp && <button className="btn btn-ghost" title="Guía de productos" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Ayuda de Productos', text: 'Busca productos, edita precios y stock, o agrega nuevos artículos. Usa el campo de búsqueda para filtrar por nombre o SKU. Los cambios se guardan en la base y se reflejan en Ventas.' } })) } catch {} }}>Ayuda</button>}
      </div>
      <div id="prod-form" className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        <input ref={nameRef} placeholder="Nombre" title="Nombre del producto" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        {showHelp && <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Información sobre nombre" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Nombre del producto', text: 'El nombre aparece en Ventas y en el ticket. Usa un nombre claro y corto.' } })) } catch {} }}><IconInfo /></button>}
        <input placeholder="SKU" title="Código interno o de barras" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
        {showHelp && <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Información sobre SKU" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'SKU', text: 'El SKU permite agregar productos rápidamente por código o escaneo.' } })) } catch {} }}><IconInfo /></button>}
        <input placeholder="Precio" title="Precio unitario" type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })} />
        {showHelp && <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Información sobre precio" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Precio', text: 'Es el precio por unidad. Se usa para calcular el total en el carrito.' } })) } catch {} }}><IconInfo /></button>}
        <input placeholder="Stock" title="Inventario disponible" type="number" step="0.001" value={form.stock} onChange={e => setForm({ ...form, stock: +e.target.value })} />
        {showHelp && <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Información sobre stock" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Stock', text: 'Cantidad disponible. Las ventas disminuyen el stock automáticamente.' } })) } catch {} }}><IconInfo /></button>}
        <div style={{ gridColumn: 'span 4', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={save} disabled={loading} title="Guardar nuevo producto">Guardar</button>
        </div>
      </div>
      <table className="table" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>ID</th><th>Nombre</th><th>SKU</th><th className="right">Precio</th><th className="right">Stock</th><th></th>
          </tr>
        </thead>
        <tbody>
          {list.map(p => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.name}</td>
              <td>{p.sku}</td>
              <td className="right">{fmt.format(p.price)}</td>
              <td className="right">{p.stock}</td>
              <td><button className="btn btn-ghost" onClick={() => remove(p.id)} title="Eliminar producto">Eliminar</button></td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr><td colSpan="6">No hay productos. Agrega un producto arriba.</td></tr>
          )}
        </tbody>
      </table>
      {delProductId && (
        <div className="modal-overlay" onClick={() => { setDelProductId(null); setDelProductName('') }}>
          <div className="card modal" onClick={e => e.stopPropagation()}>
            <h3>Eliminar producto</h3>
            <div className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 3 L3 21 H21 Z" fill="none" stroke="var(--accent, #e53935)" strokeWidth="2" strokeLinejoin="round" />
                <path d="M12 9 V14" stroke="var(--accent, #e53935)" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="17" r="1.5" fill="var(--accent, #e53935)" />
              </svg>
              <div>¿Seguro que deseas eliminar {delProductName ? `"${delProductName}"` : 'este producto'}? Esta acción no se puede deshacer.</div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => { setDelProductId(null); setDelProductName('') }}>Cancelar</button>
              <button className="btn" style={{ background: 'var(--accent, #e53935)', color: '#fff' }} onClick={async () => { try { await api(`/products/${delProductId}`, { method: 'DELETE' }); await load(); try { window.dispatchEvent(new CustomEvent('app-message', { detail: 'Producto eliminado' })) } catch {} } catch {} finally { setDelProductId(null); setDelProductName('') } }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Clientes() {
  const [list, setList] = useState([])
  const [form, setForm] = useState({ name: '', phone: '', email: '', rfc: '' })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [nameTouched, setNameTouched] = useState(false)
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [rfcTouched, setRfcTouched] = useState(false)
  const showHelp = (() => { try { return localStorage.getItem('config-help-mode') !== '0' } catch { return true } })()
  const [delClientId, setDelClientId] = useState(null)
  const [delClientName, setDelClientName] = useState('')
  const nameRef = useRef(null)
  const phoneRef = useRef(null)
  const emailRef = useRef(null)
  const rfcRef = useRef(null)
  const load = async () => setList(await api('/customers'))
  useEffect(() => { load() }, [])
  const rfcValid = useMemo(() => { const r = (form.rfc || '').trim().toUpperCase(); return !r || /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(r) }, [form.rfc])
  const emailValid = useMemo(() => { const e = (form.email || '').trim(); return !e || /^\S+@\S+\.\S+$/.test(e) }, [form.email])
  const phoneValid = useMemo(() => { const p = (form.phone || '').trim(); return !p || /^\+?\d{7,15}$/.test(p) }, [form.phone])
  const nameValid = useMemo(() => (form.name || '').trim().length > 0, [form.name])
  const save = async () => {
    setSubmitted(true)
    if (!nameValid) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Nombre requerido' })) } catch {}; try { nameRef.current?.focus() } catch {}; return }
    const r = (form.rfc || '').trim().toUpperCase()
    const e = (form.email || '').trim()
    const p = (form.phone || '').trim()
    if (e && !/^\S+@\S+\.\S+$/.test(e)) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Email inválido' })) } catch {}; try { emailRef.current?.focus() } catch {}; return }
    if (p && !/^\+?\d{7,15}$/.test(p)) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Teléfono inválido' })) } catch {}; try { phoneRef.current?.focus() } catch {}; return }
    if (r && !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(r)) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'RFC inválido' })) } catch {}; try { rfcRef.current?.focus() } catch {}; return }
    setLoading(true)
    await api('/customers', { method: 'POST', body: JSON.stringify({ ...form, rfc: r || null, email: e || null, phone: p || null }) })
    setForm({ name: '', phone: '', email: '', rfc: '' })
    setSubmitted(false)
    setNameTouched(false)
    setPhoneTouched(false)
    setEmailTouched(false)
    setRfcTouched(false)
    await load()
    setLoading(false)
  }
  const remove = async (id) => { await api(`/customers/${id}`, { method: 'DELETE' }); await load() }
  const askRemove = (id) => { const c = list.find(x => x.id === id); setDelClientId(id); setDelClientName(c?.name || '') }
  return (
    <div className="container view">
      <h2>Clientes</h2>
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
        <button className="btn" onClick={() => { try { document.getElementById('cli-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); nameRef.current?.focus() } catch {} }} title="Agregar un nuevo cliente">Agregar cliente</button>
        {showHelp && <button className="btn btn-ghost" title="Guía de clientes" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Ayuda de Clientes', text: 'Consulta y gestiona clientes. Busca por nombre, ID o RFC. Visualiza contacto y RFC, y revisa adeudos. Para registrar pagos de adeudos, inicia sesión en Configuración.' } })) } catch {} }}>Ayuda</button>}
      </div>
      <div id="cli-form" className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        <input ref={nameRef} placeholder="Nombre" title="Nombre del cliente" autoComplete="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} onBlur={() => setNameTouched(true)} className={(submitted || nameTouched) && !nameValid ? 'invalid' : ''} />
        {showHelp && <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Información sobre el nombre" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Nombre', text: 'Requerido para identificar al cliente en ventas con crédito y reportes.' } })) } catch {} }}><IconInfo /></button>}
        <input ref={phoneRef} type="tel" inputMode="tel" autoComplete="tel" placeholder="Teléfono (+525512345678)" title="Número de contacto con código de país" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} onBlur={() => { setPhoneTouched(true); const raw = (form.phone || '').trim(); let v = raw.replace(/[^0-9+]/g, ''); if (v.includes('+')) { v = '+' + v.replace(/\+/g, ''); } if (v !== form.phone) setForm({ ...form, phone: v }); }} className={(submitted || phoneTouched) && !phoneValid ? 'invalid' : ''} />
        {showHelp && <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Información sobre teléfono" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Teléfono', text: 'Formato sugerido con código de país: +52... Útil para contacto en crédito.' } })) } catch {} }}><IconInfo /></button>}
        <input ref={emailRef} type="email" autoComplete="email" placeholder="Email (usuario@dominio.com)" title="Correo electrónico" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} onBlur={() => { setEmailTouched(true); const e = (form.email || '').trim().toLowerCase(); if (e !== form.email) setForm({ ...form, email: e }); }} className={(submitted || emailTouched) && !emailValid ? 'invalid' : ''} />
        {showHelp && <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Información sobre email" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Email', text: 'Se usa para contacto y puede mostrarse en tickets de crédito según la configuración.' } })) } catch {} }}><IconInfo /></button>}
        <input ref={rfcRef} maxLength={13} placeholder="RFC (ABCX010203XYZ)" title="RFC del cliente (opcional)" value={form.rfc} onChange={e => setForm({ ...form, rfc: e.target.value })} onBlur={() => { setRfcTouched(true); const r = (form.rfc || '').trim().toUpperCase().replace(/\s+/g, ''); if (r !== form.rfc) setForm({ ...form, rfc: r }); }} className={(submitted || rfcTouched) && !rfcValid ? 'invalid' : ''} />
        {showHelp && <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Información sobre RFC" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'RFC', text: 'Opcional. Puede mostrarse en tickets de crédito si así lo decides en Configuración.' } })) } catch {} }}><IconInfo /></button>}
        {(submitted || nameTouched) && !nameValid && <div className="muted" style={{ gridColumn: 'span 4' }}>Nombre requerido</div>}
        {(submitted || emailTouched) && !emailValid && <div className="muted" style={{ gridColumn: 'span 4' }}>Email inválido</div>}
        {(submitted || phoneTouched) && !phoneValid && <div className="muted" style={{ gridColumn: 'span 4' }}>Teléfono inválido</div>}
        {(submitted || rfcTouched) && !rfcValid && <div className="muted" style={{ gridColumn: 'span 4' }}>RFC inválido</div>}
        <div style={{ gridColumn: 'span 4', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={save} disabled={loading || !nameValid || !emailValid || !phoneValid || !rfcValid} title="Guardar cliente">Guardar</button>
        </div>
      </div>
      <table className="table" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>ID</th><th>Nombre</th><th className="hide-sm">Teléfono</th><th className="hide-sm">Email</th><th className="hide-xs">RFC</th><th></th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 && (
            <tr><td colSpan="6">No hay clientes. Guarda un cliente nuevo arriba.</td></tr>
          )}
          {list.map(c => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.name}</td>
              <td className="hide-sm">{c.phone}</td>
              <td className="hide-sm">{c.email}</td>
              <td className="hide-xs">{c.rfc || '-'}</td>
              <td><button className="btn btn-ghost" onClick={() => askRemove(c.id)} title="Eliminar cliente">Eliminar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {delClientId && (
        <div className="modal-overlay" onClick={() => { setDelClientId(null); setDelClientName('') }}>
          <div className="card modal" onClick={e => e.stopPropagation()}>
            <h3>Eliminar cliente</h3>
            <div className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 3 L3 21 H21 Z" fill="none" stroke="var(--accent, #e53935)" strokeWidth="2" strokeLinejoin="round" />
                <path d="M12 9 V14" stroke="var(--accent, #e53935)" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="17" r="1.5" fill="var(--accent, #e53935)" />
              </svg>
              <div>¿Seguro que deseas eliminar {delClientName ? `"${delClientName}"` : 'este cliente'}? No se podrá recuperar.</div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => { setDelClientId(null); setDelClientName('') }}>Cancelar</button>
              <button className="btn" style={{ background: 'var(--accent, #e53935)', color: '#fff' }} onClick={async () => { try { await api(`/customers/${delClientId}`, { method: 'DELETE' }); await load(); try { window.dispatchEvent(new CustomEvent('app-message', { detail: 'Cliente eliminado' })) } catch {} } catch {} finally { setDelClientId(null); setDelClientName('') } }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Ventas() {
  const [products, setProducts] = useState([])
  const [productFilter, setProductFilter] = useState('')
  const [skuInput, setSkuInput] = useState('')
  const [cart, setCart] = useState([])
  const [productQtyMap, setProductQtyMap] = useState({})
  const productSearchRef = useRef(null)
  const skuRef = useRef(null)
  const discountRef = useRef(null)
  const [discount, setDiscount] = useState(0)
  const [customerId, setCustomerId] = useState('')
  const [customerTouched, setCustomerTouched] = useState(false)
  const customerRef = useRef(null)
  const newProdNameRef = useRef(null)
  const newClientNameRef = useRef(null)
  const [newProdAutoAdd, setNewProdAutoAdd] = useState(() => { try { return localStorage.getItem('autoAddProduct') !== '0' } catch { return true } })
  const [newClientSelectCurrent, setNewClientSelectCurrent] = useState(() => { try { return localStorage.getItem('selectNewClient') !== '0' } catch { return true } })
  const [customers, setCustomers] = useState([])
  const [customerQuery, setCustomerQuery] = useState('')
  const [receivablesSummary, setReceivablesSummary] = useState(null)
  const [showReceivables, setShowReceivables] = useState(false)
  const [receivablesList, setReceivablesList] = useState([])
  const [payAmounts, setPayAmounts] = useState({})
  const [receivablePayments, setReceivablePayments] = useState({})
  const [expandedReceivables, setExpandedReceivables] = useState({})
  const [payments, setPayments] = useState([{ method: 'cash', amount: 0 }])
  const [currency, setCurrency] = useState('MXN')
  const [taxRate, setTaxRate] = useState(0.16)
  const [businessName, setBusinessName] = useState('')
  const [businessRFC, setBusinessRFC] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [logoDataUrl, setLogoDataUrl] = useState('')
  const [ticketWidth, setTicketWidth] = useState(80)
  const [logoSize, setLogoSize] = useState(20)
  const [autoScan, setAutoScan] = useState(false)
  const scanTimerRef = useRef(null)
  const [ticketFooter, setTicketFooter] = useState('')
  const [ticketQrDataUrl, setTicketQrDataUrl] = useState('')
  const [ticketQrCaption, setTicketQrCaption] = useState('')
  const [ticketQr2DataUrl, setTicketQr2DataUrl] = useState('')
  const [ticketQr2Caption, setTicketQr2Caption] = useState('')
  const [ticketQrSize, setTicketQrSize] = useState(32)
  const [creditTicketShowContact2, setCreditTicketShowContact2] = useState(true)
  const [creditTicketShowRFC2, setCreditTicketShowRFC2] = useState(true)
  const [ticketBodySize2, setTicketBodySize2] = useState(10)
  const [ticketLineGap2, setTicketLineGap2] = useState(5)
  const [ticketHeaderSize2, setTicketHeaderSize2] = useState(12)
  const [ticketCompact2, setTicketCompact2] = useState(false)
  const showHelp = (() => { try { return localStorage.getItem('config-help-mode') !== '0' } catch { return true } })()
  const [newProdOpen, setNewProdOpen] = useState(false)
  const [newProd, setNewProd] = useState({ name: '', sku: '', price: 0, stock: 0 })
  const [newClientOpen, setNewClientOpen] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '', rfc: '' })
  const [newSaving, setNewSaving] = useState(false)
  const [productsLoading, setProductsLoading] = useState(false)

  useEffect(() => { api('/settings').then(s => { setCurrency(s.currency || 'MXN'); setTaxRate(+s.tax_rate || 0.16); setBusinessName(s.business_name || ''); setBusinessRFC(s.business_rfc || ''); setBusinessPhone(s.business_phone || ''); setBusinessEmail(s.business_email || ''); setBusinessAddress(s.business_address || ''); setLogoDataUrl(s.logo_data_url || ''); setTicketWidth(parseInt(s.ticket_width || '80')); setLogoSize(parseInt(s.ticket_logo_size_mm || '20')); setAutoScan(String(s.auto_scan || '') === '1'); setTicketFooter(s.ticket_footer || ''); setTicketQrDataUrl(s.ticket_qr_data_url || ''); setTicketQrCaption(s.ticket_qr_caption || ''); setTicketQr2DataUrl(s.ticket_qr2_data_url || ''); setTicketQr2Caption(s.ticket_qr2_caption || ''); setTicketQrSize(parseInt(s.ticket_qr_size_mm || String((parseInt(s.ticket_width || '80') <= 58) ? 26 : 32))); setCreditTicketShowContact2(String(s.credit_ticket_show_contact || '1') === '1'); setCreditTicketShowRFC2(String(s.credit_ticket_show_rfc || '1') === '1'); setTicketBodySize2(parseInt(s.ticket_font_body_size || '10')); setTicketLineGap2(parseInt(s.ticket_line_gap_mm || '5')); setTicketHeaderSize2(parseInt(s.ticket_font_header_size || '12')); setTicketCompact2(String(s.ticket_compact_mode || '0') === '1') }) }, [])
  const fmt = useMemo(() => new Intl.NumberFormat(undefined, { style: 'currency', currency }), [currency])

  const loadProducts = async () => { try { setProductsLoading(true); const list = await api('/products'); setProducts(list) } catch { setProducts([]) } finally { setProductsLoading(false) } }
  useEffect(() => { loadProducts() }, [])
  const loadCustomers = async () => setCustomers(await api('/customers'))
  useEffect(() => { loadCustomers() }, [])
  useEffect(() => { (async () => { try {
    if (!customerId) { setReceivablesSummary(null); return }
    const s = await api(`/receivables/summary/${customerId}`)
    setReceivablesSummary(s)
  } catch { setReceivablesSummary(null) } })() }, [customerId])
  useEffect(() => { (async () => { try {
    if (!showReceivables || !customerId) { if (!showReceivables) setReceivablesList([]); return }
    const rows = await api(`/receivables/by-customer/${customerId}`)
    setReceivablesList(rows)
  } catch { setReceivablesList([]) } })() }, [showReceivables, customerId])

  const addToCart = (p, qty = 1) => {
    const q = Math.max(1, parseInt(qty || 1))
    const existing = cart.find(i => i.product_id === p.id)
    if (existing) setCart(cart.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + q } : i))
    else setCart([...cart, { product_id: p.id, name: p.name, unit_price: p.price, quantity: q }])
  }
  const addBySku = (sku) => {
    const p = products.find(x => String(x.sku || '').toLowerCase() === String(sku || '').toLowerCase())
    if (p) addToCart(p)
  }
  useEffect(() => { if (!autoScan) return; if (!skuInput) return; if (scanTimerRef.current) clearTimeout(scanTimerRef.current); scanTimerRef.current = setTimeout(() => { addBySku(skuInput); setSkuInput('') }, 300); return () => { if (scanTimerRef.current) { clearTimeout(scanTimerRef.current); scanTimerRef.current = null } } }, [skuInput, autoScan])
  useEffect(() => { try { productSearchRef.current?.focus() } catch {} }, [])
  useEffect(() => { try { const q = localStorage.getItem('productFilter') || ''; if (q) setProductFilter(q) } catch {} }, [])
  useEffect(() => { try { localStorage.setItem('productFilter', productFilter || '') } catch {} }, [productFilter])
  useEffect(() => { try { if (newProdOpen) setTimeout(() => newProdNameRef.current?.focus(), 0) } catch {} }, [newProdOpen])
  useEffect(() => { try { if (newClientOpen) setTimeout(() => newClientNameRef.current?.focus(), 0) } catch {} }, [newClientOpen])
  useEffect(() => { try { localStorage.setItem('autoAddProduct', newProdAutoAdd ? '1' : '0') } catch {} }, [newProdAutoAdd])
  useEffect(() => { try { localStorage.setItem('selectNewClient', newClientSelectCurrent ? '1' : '0') } catch {} }, [newClientSelectCurrent])

  useEffect(() => {
    const onKey = (e) => {
      try {
        if (e.key === 'F1') { e.preventDefault(); productSearchRef.current?.focus(); return }
        if (e.key === 'F2') { e.preventDefault(); skuRef.current?.focus(); return }
        if (e.key === 'F3') { e.preventDefault(); customerRef.current?.focus(); return }
        if (e.altKey && e.key === 'Enter') { e.preventDefault(); const rest = Math.max(0, totals.total - payTotal); if (!(rest > 0)) return; const idx = payments.findIndex(p => p.method === 'cash'); if (idx >= 0) setPayments(payments.map((x,i)=> i===idx?{...x,amount:(x.amount||0)+rest}:x)); else setPayments([...payments, { method: 'cash', amount: rest }]); try { window.dispatchEvent(new CustomEvent('app-message', { detail: 'Pendiente completado en efectivo' })) } catch {}; return }
        if (e.altKey && String(e.key).toLowerCase() === 'c') { e.preventDefault(); const rest = Math.max(0, totals.total - payTotal); if (!(rest > 0)) return; if (!creditAllowed) return; const idx = payments.findIndex(p => p.method === 'credit'); if (idx >= 0) setPayments(payments.map((x,i)=> i===idx?{...x,amount:rest}:x)); else setPayments([...payments, { method: 'credit', amount: rest }]); try { window.dispatchEvent(new CustomEvent('app-message', { detail: 'Pendiente enviado a crédito' })) } catch {}; return }
        if (e.altKey && String(e.key).toLowerCase() === 'd') { e.preventDefault(); discountRef.current?.focus(); return }
        if (e.altKey && String(e.key).toLowerCase() === 'p') { e.preventDefault(); setNewProdOpen(true); return }
        if (e.altKey && String(e.key).toLowerCase() === 'n') { e.preventDefault(); setNewClientOpen(true); return }
        if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); checkout(); return }
      } catch {}
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const saveNewProduct = async () => {
    const f = { ...newProd }
    const name = String(f.name || '').trim()
    if (!name) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Nombre requerido' })) } catch {}; return }
    setNewSaving(true)
    try {
      const created = await api('/products', { method: 'POST', body: JSON.stringify({ name, sku: String(f.sku || '').trim(), price: +parseFloat(f.price || 0), stock: +parseFloat(f.stock || 0) }) })
      if (created && created.id) { if (newProdAutoAdd) addToCart(created) }
      else {
        try {
          const list = await api('/products')
          const found = list.find(p => (String(p.sku || '').toLowerCase() === String(f.sku || '').toLowerCase()) || (String(p.name || '') === name))
          if (found && newProdAutoAdd) addToCart(found)
        } catch {}
      }
      setNewProd({ name: '', sku: '', price: 0, stock: 0 })
      setNewProdOpen(false)
      await loadProducts()
      try { window.dispatchEvent(new CustomEvent('app-message', { detail: newProdAutoAdd ? 'Producto agregado al carrito' : 'Producto agregado' })) } catch {}
    } catch (e) {
      try { window.dispatchEvent(new CustomEvent('app-error', { detail: String(e?.message || 'Error') })) } catch {}
    } finally { setNewSaving(false) }
  }

  const saveNewClient = async () => {
    const f = { ...newClient }
    const name = String(f.name || '').trim()
    const email = String(f.email || '').trim().toLowerCase()
    const phone = String(f.phone || '').trim()
    const rfc = String(f.rfc || '').trim().toUpperCase().replace(/\s+/g, '')
    if (!name) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Nombre requerido' })) } catch {}; return }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Email inválido' })) } catch {}; return }
    if (phone && !/^\+?\d{7,15}$/.test(phone)) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Teléfono inválido' })) } catch {}; return }
    if (rfc && !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc)) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'RFC inválido' })) } catch {}; return }
    setNewSaving(true)
    try {
      const created = await api('/customers', { method: 'POST', body: JSON.stringify({ name, email: email || null, phone: phone || null, rfc: rfc || null }) })
      setNewClient({ name: '', phone: '', email: '', rfc: '' })
      setNewClientOpen(false)
      await loadCustomers()
      if (created && created.id && newClientSelectCurrent) { setCustomerId(String(created.id)); setCustomerTouched(true) }
      try { window.dispatchEvent(new CustomEvent('app-message', { detail: (created && created.id && newClientSelectCurrent) ? 'Cliente agregado y seleccionado' : 'Cliente agregado' })) } catch {}
    } catch (e) {
      try { window.dispatchEvent(new CustomEvent('app-error', { detail: String(e?.message || 'Error') })) } catch {}
    } finally { setNewSaving(false) }
  }

  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, i) => acc + i.unit_price * i.quantity, 0)
    const tax = +(subtotal * taxRate).toFixed(2)
    const disc = +parseFloat(discount || 0)
    const discApplied = Math.max(0, Math.min(disc, subtotal + tax))
    const total = +((subtotal + tax) - discApplied).toFixed(2)
    return { subtotal, tax, discount: discApplied, total }
  }, [cart, discount])

  const payTotal = useMemo(() => payments.reduce((acc, p) => acc + (p.amount || 0), 0), [payments])
  const hasCredit = useMemo(() => payments.some(p => p.method === 'credit' && p.amount > 0), [payments])
  const customerExists = useMemo(() => customers.some(c => String(c.id) === String(customerId)), [customers, customerId])
  const customerValid = useMemo(() => !hasCredit || (/^\d+$/.test((customerId || '')) && customerExists), [hasCredit, customerId, customerExists])
  const creditAllowed = useMemo(() => !(receivablesSummary && (receivablesSummary.total_due || 0) > 0), [receivablesSummary])

  const checkout = async () => {
    if (!cart.length) return
    if (!customerValid) { setCustomerTouched(true); try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Crédito requiere ID cliente válido' })) } catch {}; try { customerRef.current?.focus() } catch {}; return }
    const items = cart.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price }))
    const pending = Math.max(0, totals.total - payTotal)
    let payList = payments.filter(p => p.amount > 0).map(p => ({ ...p }))
    if (pending > 0) {
      if (!hasCredit) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Falta cubrir el total o agregar crédito' })) } catch {}; return }
      const idx = payList.findIndex(p => p.method === 'credit')
      if (idx >= 0) payList[idx].amount = pending
      else payList.push({ method: 'credit', amount: pending })
    } else {
      payList = payList.filter(p => p.method !== 'credit')
    }
    const sale = await api('/sales', { method: 'POST', body: JSON.stringify({ customer_id: customerId ? +customerId : null, items, discount: totals.discount || 0, payment_method: (payList[0]?.method || 'cash'), payments: payList }) })
    const confirmPrint = window.confirm(`Venta #${sale.id} total ${fmt.format(sale.total)}${sale.customer_name ? ` · Cliente: ${sale.customer_name}` : ''}. ¿Imprimir ticket PDF?`)
    if (confirmPrint) {
      const detail = await api(`/sales/${sale.id}`)
      const doc = new jsPDF({ unit: 'mm', format: [ticketWidth || 80, 240] })
      const pageW = doc.internal.pageSize.getWidth()
      let y = 10
      if (logoDataUrl) { try { const m = String(logoDataUrl).match(/^data:image\/(png|jpeg|jpg);/i); const fmt = (m?.[1] || 'PNG').toUpperCase().replace('JPG','JPEG'); const w = logoSize || 20; const x = (pageW - w) / 2; doc.addImage(logoDataUrl, fmt, x, y, w, w); y += (w + 2) } catch {} }
      doc.setFontSize(ticketHeaderSize2)
      doc.text(businessName || 'PUNTO DE VENTA', pageW / 2, y, { align: 'center' }); y += 6
      doc.setFontSize(ticketBodySize2)
      const gap2 = (ticketCompact2 ? Math.max(3, ticketLineGap2 - 2) : ticketLineGap2)
      if (businessAddress) { doc.text(String(businessAddress), pageW / 2, y, { align: 'center' }); y += gap2 }
      if (businessPhone) { doc.text(String(businessPhone), pageW / 2, y, { align: 'center' }); y += gap2 }
      if (businessEmail) { doc.text(String(businessEmail), pageW / 2, y, { align: 'center' }); y += gap2 }
      if (businessRFC) { doc.text(`RFC: ${businessRFC}`, pageW / 2, y, { align: 'center' }); y += gap2 }
      doc.text(`Ticket #${detail.id}`, pageW / 2, y, { align: 'center' }); y += 5
      doc.text(new Date(detail.created_at).toLocaleString(), pageW / 2, y, { align: 'center' }); y += 5
      if (Array.isArray(detail.payments) && detail.payments.some(p => String(p.method) === 'credit' && (p.amount || 0) > 0)) {
        if (detail.customer_name) { doc.text(`Cliente: ${detail.customer_name}`, pageW / 2, y, { align: 'center' }); y += gap2 }
        if (creditTicketShowRFC2 && detail.customer_rfc) { doc.text(`RFC: ${detail.customer_rfc}`, pageW / 2, y, { align: 'center' }); y += gap2 }
        if (creditTicketShowContact2) {
          if (detail.customer_phone) { doc.text(`Tel: ${detail.customer_phone}`, pageW / 2, y, { align: 'center' }); y += gap2 }
          if (detail.customer_email) { doc.text(String(detail.customer_email), pageW / 2, y, { align: 'center' }); y += gap2 }
        }
      }
      doc.line(8, y, pageW - 8, y); y += 4
      doc.text('Cant', 10, y)
      doc.text('Producto', 26, y)
      doc.text('P.Unit', pageW - 28, y, { align: 'right' })
      doc.text('Importe', pageW - 8, y, { align: 'right' }); y += 5
      doc.line(8, y, pageW - 8, y); y += 4
      const maxDesc = (ticketWidth || 80) <= 58 ? 16 : 24
      for (const it of detail.items) {
        const desc = String(it.product_name || `#${it.product_id}`).slice(0, maxDesc)
        doc.text(String(it.quantity), 10, y)
        doc.text(desc, 26, y)
        doc.text(fmt.format(it.unit_price), pageW - 28, y, { align: 'right' })
        doc.text(fmt.format(it.line_total), pageW - 8, y, { align: 'right' })
        y += (ticketCompact2 ? Math.max(3, ticketLineGap2 - 2) : ticketLineGap2)
      }
      doc.line(8, y, pageW - 8, y); y += 4
      doc.text(`Subtotal: ${fmt.format(detail.subtotal)}`, pageW - 8, y, { align: 'right' }); y += gap2
      doc.text(`IVA: ${fmt.format(detail.tax)}`, pageW - 8, y, { align: 'right' }); y += gap2
      if (detail.discount) { doc.text(`Descuento: ${fmt.format(detail.discount)}`, pageW - 8, y, { align: 'right' }); y += gap2 }
      doc.setFontSize(ticketHeaderSize2)
      doc.text(`TOTAL: ${fmt.format(detail.total)}`, pageW - 8, y, { align: 'right' }); y += 8
      if (Array.isArray(detail.payments) && detail.payments.some(p => String(p.method) === 'credit' && (p.amount || 0) > 0)) { doc.setFontSize(ticketBodySize2); doc.text('CRÉDITO', 10, y); y += gap2 }
      if (Array.isArray(detail.payments) && detail.payments.length) {
        doc.setFontSize(ticketBodySize2)
        doc.line(8, y, pageW - 8, y); y += 4
        doc.text('Pagos', 10, y); y += 5
        let creditAmt = 0
        for (const p of detail.payments) {
          doc.text(String(p.method), 10, y)
          doc.text(fmt.format(p.amount || 0), pageW - 8, y, { align: 'right' })
          y += gap2
          if (String(p.method) === 'credit') creditAmt += (p.amount || 0)
        }
        if (creditAmt > 0) { doc.text(`Crédito: ${fmt.format(creditAmt)}`, pageW - 8, y, { align: 'right' }); y += gap2; doc.text('Venta con crédito', 10, y); y += 6 }
      }
      if (ticketQrDataUrl) { try { const size = ticketQrSize || ((ticketWidth || 80) <= 58 ? 26 : 32); const x = (pageW - size) / 2; doc.addImage(ticketQrDataUrl, 'PNG', x, y, size, size); y += (size + 4); if (ticketQrCaption) { doc.setFontSize(ticketBodySize2); doc.text(String(ticketQrCaption), pageW / 2, y, { align: 'center' }); y += gap2 } } catch {} }
      if (ticketQr2DataUrl) { try { const size = ticketQrSize || ((ticketWidth || 80) <= 58 ? 26 : 32); const x = (pageW - size) / 2; doc.addImage(ticketQr2DataUrl, 'PNG', x, y, size, size); y += (size + 4); if (ticketQr2Caption) { doc.setFontSize(ticketBodySize2); doc.text(String(ticketQr2Caption), pageW / 2, y, { align: 'center' }); y += gap2 } } catch {} }
      if (ticketFooter) { doc.setFontSize(9); const lines = doc.splitTextToSize(String(ticketFooter), pageW - 16); doc.text(lines, pageW / 2, y, { align: 'center' }) }
      doc.save(`ticket_${detail.id}.pdf`)
    }
    setCart([])
    setPayments([{ method: 'cash', amount: 0 }])
    await loadProducts()
  }

  return (
    <div className="container view">
      <h2>Ventas</h2>
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
        {showHelp && <button className="btn btn-ghost" title="Guía de ventas" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Ayuda de Ventas', text: '1) Busca o escanea un producto.\n2) Agrega al carrito y ajusta cantidades.\n3) Aplica descuento si es necesario.\n4) Selecciona cliente para crédito.\n5) Agrega pagos (efectivo, tarjeta, transferencia, crédito).\nAtajos: Alt+Enter completa en efectivo, Alt+C manda pendiente a crédito, Alt+D enfoca descuento. Ctrl+Enter cobra.' } })) } catch {} }}>Ayuda</button>}
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 2 }}>
          <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <input ref={productSearchRef} placeholder="Buscar producto" value={productFilter} onChange={e => setProductFilter(e.target.value)} style={{ maxWidth: 240 }} title="Buscar por nombre o SKU" />
            {showHelp && <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Cómo buscar productos" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Buscar productos', text: 'Escribe parte del nombre o el SKU para filtrar. Atajo F1 enfoca la búsqueda.' } })) } catch {} }}>Info</button>}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input ref={skuRef} placeholder="Escanear / SKU" value={skuInput} onChange={e => setSkuInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { addBySku(skuInput); setSkuInput('') } }} style={{ maxWidth: 200 }} title="Escanea o escribe el código del producto" />
              <button className="btn" onClick={() => { addBySku(skuInput); setSkuInput('') }} title="Agregar producto usando su código">Agregar por código</button>
              <button className="btn" onClick={() => setNewProdOpen(true)} title="Agregar un nuevo producto">Nuevo producto</button>
              {showHelp && <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Cómo usar el lector" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Escaneo / SKU', text: 'Si activas Escaneo automático en Configuración, al teclear el SKU se agrega solo. Atajo F2 enfoca el campo.' } })) } catch {} }}>Info</button>}
            </div>
          </div>
            <table className="table">
              <thead><tr><th>ID</th><th>Nombre</th><th className="right">Precio</th><th className="right hide-sm">Stock</th><th></th></tr></thead>
              <tbody>
                {products.filter(p => {
                  const q = productFilter.trim().toLowerCase()
                  if (!q) return true
                  return (p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
                }).map(p => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{(() => { const q = productFilter.trim().toLowerCase(); const name = String(p.name || ''); if (!q) return name; const idx = name.toLowerCase().indexOf(q); if (idx < 0) return name; const pre = name.slice(0, idx); const match = name.slice(idx, idx + q.length); const post = name.slice(idx + q.length); return (<span>{pre}<span style={{ backgroundColor: 'rgba(255, 234, 0, 0.45)' }}>{match}</span>{post}</span>) })()}</td>
                    <td className="right">{fmt.format(p.price)}</td>
                    <td className="right hide-sm">{p.stock} {p.stock <= 0 ? (<span className="badge badge-accent" style={{ marginLeft: 6 }}>Sin stock</span>) : null}</td>
                    <td>
                      <div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                        <button className="btn btn-mini" onClick={() => setProductQtyMap({ ...productQtyMap, [p.id]: Math.max(1, (productQtyMap[p.id] ?? 1) - 1) })} title="Reducir cantidad">-</button>
                        <input type="number" min="1" step="1" value={productQtyMap[p.id] ?? 1} onChange={e => setProductQtyMap({ ...productQtyMap, [p.id]: Math.max(1, parseInt(e.target.value || '1')) })} style={{ maxWidth: 70 }} title="Cantidad a agregar" />
                        <button className="btn btn-mini" onClick={() => setProductQtyMap({ ...productQtyMap, [p.id]: (productQtyMap[p.id] ?? 1) + 1 })} title="Aumentar cantidad">+</button>
                        <button className="btn" onClick={(e) => addToCart(p, e.shiftKey ? 5 : (productQtyMap[p.id] ?? 1))} title="Agregar al carrito (Shift agrega 5)">Agregar</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {productsLoading && (
                  <tr><td colSpan="5">
                    <div className="row" style={{ alignItems: 'center', gap: 10 }}>
                      <div className="spinner" />
                      <span className="muted">Cargando productos...</span>
                    </div>
                    <div className="row" style={{ marginTop: 8, gap: 6 }}>
                      <div className="skeleton-line" style={{ width: '25%' }} />
                      <div className="skeleton-line" style={{ width: '45%' }} />
                      <div className="skeleton-line" style={{ width: '15%' }} />
                      <div className="skeleton-line" style={{ width: '15%' }} />
                    </div>
                  </td></tr>
                )}
                {(() => { const q = productFilter.trim().toLowerCase(); const list = products.filter(p => { if (!q) return true; return (p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)) }); return list.length === 0 ? (<tr><td colSpan="5">Sin resultados <button className="btn btn-ghost" onClick={() => setProductFilter('')}>Limpiar</button></td></tr>) : null })()}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3>Carrito</h3>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn btn-ghost" onClick={() => { if (cart.length === 0) return; const ok = window.confirm('¿Vaciar carrito completo?'); if (!ok) return; setCart([]); try { window.dispatchEvent(new CustomEvent('app-message', { detail: 'Carrito vaciado' })) } catch {} }} title="Eliminar todos los ítems">Vaciar carrito</button>
                {showHelp && <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Ayuda del carrito" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Carrito', text: 'Usa + y - para ajustar cantidades, Quitar para eliminar un ítem. Subtotal e IVA se calculan automáticamente.' } })) } catch {} }}><IconInfo /></button>}
              </div>
            </div>
            {(() => { const pending = Math.max(0, totals.total - payTotal); const label = pending > 0 ? `Pendiente: ${fmt.format(pending)}` : 'Completado'; return (
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                <span className="muted">Total: {fmt.format(totals.total)}</span>
                <span className={pending > 0 ? 'badge badge-accent' : 'badge badge-primary'}>{label}</span>
              </div>
            ) })()}
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
              <span className="muted">Subtotal: {fmt.format(totals.subtotal)} · IVA: {fmt.format(totals.tax)} · Descuento: {fmt.format(totals.discount)}</span>
            </div>
            <table className="table">
              <thead><tr><th>Producto</th><th>Cant</th><th className="right">Precio</th><th></th></tr></thead>
              <tbody>
                {cart.length === 0 && (
                  <tr>
                    <td colSpan="4">Carrito vacío <button className="btn btn-ghost" onClick={() => { try { skuRef.current?.focus() } catch {} }} title="Ir al campo de escaneo">Agregar producto</button></td>
                  </tr>
                )}
                {cart.map((i, idx) => (
                  <tr key={idx}>
                    <td>{i.name}</td>
                    <td className="right">{i.quantity}</td>
                    <td className="right">{fmt.format(i.unit_price * i.quantity)}</td>
                    <td className="right">
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn btn-mini" onClick={() => setCart(cart.map((x,ii)=> ii===idx?{...x,quantity:x.quantity+1}:x))} title="Aumentar cantidad">+</button>
                        <button className="btn btn-mini" onClick={() => setCart(cart.map((x,ii)=> ii===idx?{...x,quantity:Math.max(1,x.quantity-1)}:x))} title="Reducir cantidad">-</button>
                        <button className="btn btn-ghost" onClick={() => setCart(cart.filter((_,ii)=> ii!==idx))} title="Quitar del carrito">Quitar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div>
              <label title="Aplica un descuento total">Descuento</label>
              <input ref={discountRef} type="number" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} style={{ maxWidth: 140, marginLeft: 8 }} title="Descuento total de la venta" placeholder="Ej. 10 o 10.50" />
              {showHelp && <button className="btn btn-ghost" style={{ padding: '6px 10px', marginLeft: 8 }} title="Sobre descuentos" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Descuento', text: 'El descuento se aplica al total con IVA. Usa Alt+D para enfocar este campo.' } })) } catch {} }}><IconInfo /></button>}
            </div>
            <div style={{ fontWeight: 700 }}>Total: {fmt.format(totals.total)}</div>
          </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4>Pagos</h4>
            {showHelp && <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Cómo registrar pagos" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Pagos', text: 'Agrega uno o más métodos (efectivo, tarjeta, transferencia, crédito). Usa los botones para completar pendiente en efectivo o crédito.' } })) } catch {} }}><IconInfo /></button>}
          </div>
          {!creditAllowed && <div className="accent" style={{ marginBottom: 6 }}>Crédito deshabilitado por adeudos</div>}
          <table className="table">
              <thead><tr><th>Método</th><th className="right">Monto</th><th></th></tr></thead>
              <tbody>
                {payments.map((p, idx) => (
                  <tr key={idx}>
                    <td>
                      <select value={p.method} onChange={e => setPayments(payments.map((x,i)=> i===idx?{...x,method:e.target.value}:x))} title="Selecciona el método de pago">
                        <option value="cash">Efectivo</option>
                        <option value="card">Tarjeta</option>
                        <option value="transfer">Transferencia</option>
                        <option value="credit" disabled={!creditAllowed}>Crédito</option>
                      </select>
                    </td>
                    <td className="right">
                      <input type="number" step="0.01" value={p.amount} onChange={e => setPayments(payments.map((x,i)=> i===idx?{...x,amount:+e.target.value}:x))} title="Monto del pago" placeholder="Monto (0 si no aplica)" />
                    </td>
                    <td><button className="btn btn-ghost" onClick={() => setPayments(payments.filter((_,i)=>i!==idx))} title="Eliminar este pago">Quitar</button></td>
                  </tr>
                ))}
              </tbody>
          </table>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" onClick={() => setPayments([...payments, { method: 'cash', amount: 0 }])} title="Agregar un nuevo pago">Agregar pago</button>
            <button className="btn btn-ghost" onClick={() => setPayments([{ method: 'cash', amount: 0 }])} title="Quitar todos los métodos de pago">Limpiar pagos</button>
          </div>
          <div style={{ marginTop: 8 }}>Pagado: {fmt.format(payTotal)}</div>
            {(() => { const cred = payments.reduce((a,p)=> a + (p.method==='credit' ? (p.amount||0) : 0), 0); return cred > 0 ? <div className="muted">Crédito previsto: {fmt.format(cred)}</div> : null })()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Pendiente: {fmt.format(Math.max(0, totals.total - payTotal))}</span>
              <button className="btn" disabled={(totals.total - payTotal) <= 0} title="Completa el pendiente con efectivo" onClick={() => {
                const rest = Math.max(0, totals.total - payTotal)
                if (!(rest > 0)) return
                const idx = payments.findIndex(p => p.method === 'cash')
                if (idx >= 0) setPayments(payments.map((x,i)=> i===idx?{...x,amount:(x.amount||0)+rest}:x))
                else setPayments([...payments, { method: 'cash', amount: rest }])
                try { window.dispatchEvent(new CustomEvent('app-message', { detail: 'Pendiente completado en efectivo' })) } catch {}
              }}>Completar en efectivo</button>
              <button className="btn" disabled={!(creditAllowed && (totals.total - payTotal) > 0)} title="Envía el pendiente a crédito" onClick={() => {
                const rest = Math.max(0, totals.total - payTotal)
                if (!(rest > 0) || !creditAllowed) return
                const idx = payments.findIndex(p => p.method === 'credit')
                if (idx >= 0) setPayments(payments.map((x,i)=> i===idx?{...x,amount:rest}:x))
                else setPayments([...payments, { method: 'credit', amount: rest }])
                try { window.dispatchEvent(new CustomEvent('app-message', { detail: 'Pendiente enviado a crédito' })) } catch {}
              }}>Completar en crédito</button>
            </div>
          </div>
          <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input ref={customerRef} type="text" inputMode="numeric" placeholder="ID cliente (solo dígitos)" value={customerId} onChange={e => setCustomerId((e.target.value || '').replace(/\D/g, ''))} onBlur={() => setCustomerTouched(true)} className={(hasCredit && customerTouched && !customerValid) ? 'invalid' : ''} title="Ingresa el ID del cliente para crédito" />
                <input placeholder="Buscar cliente" value={customerQuery} onChange={e => setCustomerQuery(e.target.value)} style={{ maxWidth: 220 }} title="Buscar cliente por nombre, ID o RFC" />
                <button className="btn" onClick={() => setNewClientOpen(true)} title="Agregar un nuevo cliente">Nuevo cliente</button>
                {showHelp && <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Cliente en ventas con crédito" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Cliente y crédito', text: 'Para usar crédito, requiere un cliente válido (ID existente). Si el cliente tiene adeudos, el crédito se deshabilita.' } })) } catch {} }}><IconInfo /></button>}
              </div>
              {customerId && (() => { try {
                const c = customers.find(x => String(x.id) === String(customerId))
                return (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="muted">Cliente seleccionado: {c?.name} #{customerId}</span>
                      <button className="btn btn-ghost" onClick={() => { setCustomerId(''); setCustomerTouched(false) }} title="Quitar el cliente seleccionado">Quitar cliente</button>
                    </div>
                    {c && (
                      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                        <span className="muted">Tel: {c.phone || '-'}</span>
                        <span className="muted">Email: {c.email || '-'}</span>
                        <span className="muted">RFC: {c.rfc || '-'}</span>
                        {receivablesSummary && <span className="accent">Adeudos: {receivablesSummary.count} · {fmt.format(receivablesSummary.total_due || 0)}</span>}
                      </div>
                    )}
                  </div>
                )
              } catch { return null } })()}
              {(() => { try {
                const q = customerQuery.trim().toLowerCase()
                if (!q) return null
                const list = customers.filter(c => (c.name?.toLowerCase().includes(q) || String(c.id).includes(q) || (c.rfc||'').toLowerCase().includes(q))).slice(0,6)
                if (!list.length) return <div className="muted" style={{ marginTop: 6 }}>Sin resultados</div>
                return (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    {list.map(c => (
                      <span key={c.id} className="btn" style={{ padding: '6px 10px' }} onClick={() => { setCustomerId(String(c.id)); setCustomerQuery(''); setCustomerTouched(true) }}>{c.name} #{c.id}</span>
                    ))}
                  </div>
                )
              } catch { return null } })()}
              {(hasCredit && customerTouched && !customerValid) && <div className="accent" style={{ marginTop: 6 }}>Crédito requiere ID cliente válido</div>}
              {receivablesSummary && (receivablesSummary.total_due || 0) > 0 && (
                <div className="accent" style={{ marginTop: 6, border: '1px solid var(--accent)', borderRadius: 6, padding: '6px 8px' }} title="El cliente tiene adeudos, el crédito se deshabilita hasta liquidar">
                  Cliente con adeudos: {receivablesSummary.count} · {fmt.format(receivablesSummary.total_due || 0)} · Crédito deshabilitado
                  <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className="btn" onClick={() => setShowReceivables(v => !v)} title="Ver u ocultar adeudos del cliente">{showReceivables ? 'Ocultar adeudos' : 'Ver adeudos'}</button>
                    {showHelp && <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Registrar pagos de adeudos" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Adeudos y pagos', text: 'Puedes registrar pagos de adeudos si has iniciado sesión en Configuración. Ingresa el monto y usa “Registrar pago”.' } })) } catch {} }}><IconInfo /></button>}
                  </div>
              {showReceivables && (
                    <table className="table" style={{ marginTop: 6 }}>
                      <thead><tr><th>ID</th><th>Venta</th><th className="right">Adeudo</th><th className="right">Pagado</th><th className="right">Pendiente</th><th>Estado</th></tr></thead>
                      <tbody>
                        {receivablesList.length === 0 && <tr><td colSpan="6">Sin adeudos</td></tr>}
                        {receivablesList.map(r => (
                          <tr key={r.id}>
                            <td>{r.id}</td>
                            <td>{r.sale_id}</td>
                            <td className="right">{fmt.format(r.amount_due || 0)}</td>
                            <td className="right">{fmt.format(r.amount_paid || 0)}</td>
                            <td className="right">{fmt.format(Math.max(0, (r.amount_due || 0) - (r.amount_paid || 0)))}</td>
                            <td>
                              <span className={r.status === 'open' ? 'badge badge-accent' : 'badge badge-primary'}>{r.status}</span>
                              {r.status === 'open' && (() => { const pending = Math.max(0, (r.amount_due || 0) - (r.amount_paid || 0)); const val = parseFloat(payAmounts[r.id]); const invalid = isNaN(val) ? false : (val <= 0 || val > pending); const isExpanded = !!expandedReceivables[r.id]; const payments = receivablePayments[r.id] || []; const count = payments.length; const avg = count ? payments.reduce((s,p)=>s+(p.amount||0),0)/count : 0; const last = payments[0]; return (
                                <div style={{ display: 'grid', gap: 6, marginTop: 4 }}>
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <input type="number" step="0.01" min="0" max={pending} placeholder="Monto" value={payAmounts[r.id] ?? ''} onChange={e => setPayAmounts({ ...payAmounts, [r.id]: e.target.value })} className={invalid ? 'invalid' : ''} style={{ maxWidth: 120 }} title="Monto a registrar" />
                                    <span className="muted">Pendiente: {fmt.format(pending)}</span>
                                    <button className="btn" disabled={invalid} title="Registrar pago de adeudo" onClick={async () => { const amt = parseFloat(payAmounts[r.id]); if (!amt || amt <= 0 || amt > pending) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Monto inválido' })) } catch {}; return } if (!localStorage.getItem('token')) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Inicia sesión para registrar pagos' })) } catch {}; return } try { await api(`/receivables/${r.id}/pay`, { method: 'POST', body: JSON.stringify({ amount: amt }) }); const rows = await api(`/receivables/by-customer/${customerId}`); setReceivablesList(rows); const s = await api(`/receivables/summary/${customerId}`); setReceivablesSummary(s); setPayAmounts({ ...payAmounts, [r.id]: '' }); try { window.dispatchEvent(new CustomEvent('app-message', { detail: 'Pago registrado' })) } catch {} } catch (e) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: String(e?.message || 'No autorizado') })) } catch {} } }}>Registrar pago</button>
                                    <button className="btn btn-ghost" onClick={async () => { const next = !isExpanded; setExpandedReceivables({ ...expandedReceivables, [r.id]: next }); if (next) { try { const pr = await api(`/receivables/${r.id}/payments`); setReceivablePayments({ ...receivablePayments, [r.id]: pr }) } catch {} } }} title="Ver/ocultar historial de pagos">{isExpanded ? 'Ocultar historial' : 'Ver historial'}</button>
                                  </div>
                                  {isExpanded && (
                                    <>
                                      <div className="muted" style={{ display: 'flex', gap: 12 }}>
                                        <span>Pagado: {fmt.format(r.amount_paid || 0)}</span>
                                        <span>Pendiente: {fmt.format(pending)}</span>
                                        <span>Pagos: {count}</span>
                                        <span>Promedio: {fmt.format(avg)}</span>
                                        <span>Último pago: {last ? `${last.username || '-'}` : '-'}</span>
                                        <span>{last ? new Date(last.created_at).toLocaleString() : ''}</span>
                                      </div>
                                      <table className="table">
                                        <thead><tr><th>ID</th><th>Usuario</th><th>Fecha</th><th className="right">Monto</th></tr></thead>
                                        <tbody>
                                          {payments.length === 0 && <tr><td colSpan="4">Sin pagos</td></tr>}
                                          {payments.map(p => (
                                            <tr key={p.id}><td>{p.id}</td><td>{p.username || '-'}</td><td>{new Date(p.created_at).toLocaleString()}</td><td className="right">{fmt.format(p.amount || 0)}</td></tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </>
                                  )}
                                </div>
                              )})()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {showReceivables && !localStorage.getItem('token') && <div className="accent" style={{ marginTop: 6 }}>Para registrar pagos, inicia sesión en Configuración</div>}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn btn-primary" onClick={checkout} disabled={!cart.length || (payTotal < totals.total && !hasCredit) || (hasCredit && !customerValid) || (hasCredit && !creditAllowed)} title="Finaliza la venta y genera el ticket">Cobrar</button>
              {(() => { try {
                let reason = ''
                if (!cart.length) reason = 'Carrito vacío'
                else if ((payTotal < totals.total) && !hasCredit) reason = 'Falta cubrir total o usar crédito'
                else if (hasCredit && !customerValid) reason = 'Crédito requiere ID cliente válido'
                else if (hasCredit && !creditAllowed) reason = 'Crédito deshabilitado por adeudos'
                return reason ? (<span className="muted">{reason}</span>) : null
              } catch { return null } })()}
            </div>
            </div>
            </div>
            </div>
      {newProdOpen && (
        <div className="modal-overlay" onClick={() => setNewProdOpen(false)}>
          <div className="card modal" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') setNewProdOpen(false); if (e.key === 'Enter' && !newSaving) saveNewProduct() }} tabIndex={-1}>
            <h3>Nuevo producto</h3>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <input ref={newProdNameRef} placeholder="Nombre" value={newProd.name} onChange={e => setNewProd({ ...newProd, name: e.target.value })} title="Nombre del producto" />
              <input placeholder="SKU" value={newProd.sku} onChange={e => setNewProd({ ...newProd, sku: e.target.value })} title="Código interno o de barras" />
              <input placeholder="Precio" type="number" step="0.01" value={newProd.price} onChange={e => setNewProd({ ...newProd, price: +e.target.value })} title="Precio unitario" />
              <input placeholder="Stock" type="number" step="0.001" value={newProd.stock} onChange={e => setNewProd({ ...newProd, stock: +e.target.value })} title="Inventario disponible" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }} title="Agregar automáticamente al carrito al guardar">
              <input type="checkbox" checked={newProdAutoAdd} onChange={e => setNewProdAutoAdd(e.target.checked)} />
              Agregar al carrito automáticamente
            </label>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setNewProdOpen(false)}>Cancelar</button>
              <button className="btn" onClick={saveNewProduct} disabled={newSaving} title="Guardar producto">{newSaving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
      {newClientOpen && (
        <div className="modal-overlay" onClick={() => setNewClientOpen(false)}>
          <div className="card modal" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') setNewClientOpen(false); if (e.key === 'Enter' && !newSaving) saveNewClient() }} tabIndex={-1}>
            <h3>Nuevo cliente</h3>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <input ref={newClientNameRef} placeholder="Nombre" value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} title="Nombre del cliente" />
              <input placeholder="Teléfono" value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} title="Teléfono" />
              <input placeholder="Email" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} title="Correo electrónico" />
              <input placeholder="RFC" maxLength={13} value={newClient.rfc} onChange={e => setNewClient({ ...newClient, rfc: e.target.value })} title="RFC (opcional)" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }} title="Seleccionar automáticamente el cliente en ventas">
              <input type="checkbox" checked={newClientSelectCurrent} onChange={e => setNewClientSelectCurrent(e.target.checked)} />
              Seleccionar como cliente actual
            </label>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setNewClientOpen(false)}>Cancelar</button>
              <button className="btn" onClick={saveNewClient} disabled={newSaving} title="Guardar cliente">{newSaving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Config({ dark, contrast }) {
  const [settings, setSettings] = useState({})
  const [seeding, setSeeding] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [demoInfo, setDemoInfo] = useState({ demo: { count: 0, total: 0 }, real: { count: 0, total: 0 } })
  const [range, setRange] = useState('todo')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState(null)
  const [logging, setLogging] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const [previewCredit, setPreviewCredit] = useState(true)
  const [previewUri, setPreviewUri] = useState('')
  const [profileName, setProfileName] = useState('')
  const [profileQuery, setProfileQuery] = useState('')
  const [profileTagFilter, setProfileTagFilter] = useState('')
  const [profileSort, setProfileSort] = useState('az')
  const [profileTags, setProfileTags] = useState('')
  const [renameTarget, setRenameTarget] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const [simpleMode, setSimpleMode] = useState(true)
  const [helpMode, setHelpMode] = useState(true)
  const [compactUi, setCompactUi] = useState(() => { try { return localStorage.getItem('ui-compact') === '1' } catch { return false } })
  const [compactIndex, setCompactIndex] = useState(false)
  const [activeSection, setActiveSection] = useState('cfg-identidad')
  const scrollTo = (id) => { try { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch {} }
  useEffect(() => {
    try {
      if (compactUi) {
        document.documentElement.setAttribute('data-compact', '1')
        localStorage.setItem('ui-compact', '1')
      } else {
        document.documentElement.removeAttribute('data-compact')
        localStorage.removeItem('ui-compact')
      }
    } catch {}
  }, [compactUi])

  const themeProfileMap = useMemo(() => { try { return JSON.parse(settings.theme_profiles || '{}') } catch { return {} } }, [settings.theme_profiles])
  const filteredProfileNames = useMemo(() => {
    let names = Object.keys(themeProfileMap)
    const q = profileQuery.trim().toLowerCase()
    if (q) names = names.filter(n => n.toLowerCase().includes(q))
    const tf = profileTagFilter.trim().toLowerCase()
    if (tf) names = names.filter(n => {
      const tags = Array.isArray(themeProfileMap[n]?.tags) ? themeProfileMap[n].tags : []
      return tags.some(t => String(t).toLowerCase().includes(tf))
    })
    names.sort((a,b) => profileSort === 'za' ? b.localeCompare(a) : a.localeCompare(b))
    return names
  }, [themeProfileMap, profileQuery, profileTagFilter, profileSort])

  const ProfileCards = () => {
    if (simpleMode || filteredProfileNames.length === 0) return null
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginTop: 10 }}>
        {filteredProfileNames.map(n => {
          const p = themeProfileMap[n] || {}
          const hasImg = !!p.theme_bg_image
          const hasOv = !!p.theme_bg_overlay_color && String(p.theme_bg_overlay_alpha || '') !== ''
          const bgImg = (() => {
            if (!hasImg) return ''
            if (hasOv) {
              try {
                const hex = (h) => { const m = String(h).replace('#',''); const r = parseInt(m.slice(0,2),16)||0; const g = parseInt(m.slice(2,4),16)||0; const b = parseInt(m.slice(4,6),16)||0; return { r, g, b } }
                const c = hex(p.theme_bg_overlay_color)
                const a = Math.max(0, Math.min(0.8, parseFloat(p.theme_bg_overlay_alpha || '0')))
                return `linear-gradient(rgba(${c.r},${c.g},${c.b},${a}), rgba(${c.r},${c.g},${c.b},${a})), url(${p.theme_bg_image})`
              } catch { return `url(${p.theme_bg_image})` }
            }
            return `url(${p.theme_bg_image})`
          })()
          const style = { height: 96, border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }
          const inner = { height: 64, backgroundImage: bgImg, backgroundColor: p.theme_bg_color || '', backgroundSize: p.theme_bg_size || 'cover', backgroundRepeat: p.theme_bg_repeat || 'no-repeat', backgroundPosition: p.theme_bg_position || 'center' }
          return (
            <div key={n} className="card" style={{ padding: 8 }}>
              <div style={style} title={n}>
                <div style={inner} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px' }}>
                  {renameTarget === n ? (
                    (() => { const nn = (renameValue || '').trim(); const invalid = (!nn || (nn !== n && !!themeProfileMap[nn])); return (
                      <input value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={async e => { if (e.key === 'Escape') { cancelRenameProfile(); return } if (e.key === 'Enter') { if (invalid) return; await renameThemeProfileTo(n, nn); cancelRenameProfile() } }} style={{ fontSize: 12, padding: '2px 6px', border: `1px solid ${invalid ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 4, maxWidth: 160 }} />
                    ) })()
                  ) : (
                    <span className="muted" style={{ fontSize: 12 }}>{n}</span>
                  )}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ width: 12, height: 12, background: p.theme_primary || '#1e88e5', borderRadius: 3, border: '1px solid var(--border)' }} />
                    <span style={{ width: 12, height: 12, background: p.theme_accent || '#e53935', borderRadius: 3, border: '1px solid var(--border)' }} />
                  </div>
                </div>
                {Array.isArray(p.tags) && p.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '0 8px 6px' }}>
                    {p.tags.map((t, i) => (
                      <span key={i} className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: 11 }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {renameTarget === n ? (
                  (() => { const nn = (renameValue || '').trim(); const invalid = (!nn || (nn !== n && !!themeProfileMap[nn])); return (
                    <>
                      <button className="btn" disabled={invalid} onClick={async () => { if (invalid) return; await renameThemeProfileTo(n, nn); cancelRenameProfile() }} title="Guardar">Guardar</button>
                      <button className="btn btn-ghost" onClick={cancelRenameProfile} title="Cancelar">Cancelar</button>
                      {invalid && <span className="accent" style={{ alignSelf: 'center' }}>Nombre inválido o duplicado</span>}
                    </>
                  ) })()
                ) : (
                  <>
                    <button className="btn" onClick={() => applyThemeProfile(n)} title="Aplicar">Aplicar</button>
                    <button className="btn btn-ghost" onClick={() => duplicateThemeProfile(n)} title="Duplicar">Duplicar</button>
                    <button className="btn btn-ghost" onClick={() => startRenameProfile(n)} title="Renombrar">Renombrar</button>
                    <button className="btn btn-ghost" onClick={() => deleteThemeProfile(n)} title="Eliminar">Eliminar</button>
                    <button className="btn btn-ghost" onClick={() => editProfileTags(n)} title="Editar etiquetas">Etiquetas</button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  useEffect(() => {
    const onScroll = () => {
      try {
        setCompactIndex(window.scrollY > 260)
        const ids = ['cfg-identidad','cfg-fecha','cfg-reportes','cfg-tema','cfg-ticket','cfg-previsualizacion','cfg-privacidad']
        let cur = ids[0]
        const y = window.scrollY
        const offset = 100
        for (const id of ids) {
          const el = document.getElementById(id)
          if (!el) continue
          const top = el.getBoundingClientRect().top + window.scrollY
          if (y + offset >= top) cur = id
        }
        setActiveSection(cur)
      } catch {}
    }
    window.addEventListener('scroll', onScroll)
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const saveThemeProfile = async () => {
    const name = (profileName || '').trim()
    if (!name) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Nombre de perfil requerido' })) } catch {}; return }
    let map = {}
    try { map = JSON.parse(settings.theme_profiles || '{}') } catch {}
    const tags = String(profileTags || '').split(',').map(t => t.trim()).filter(Boolean)
    const subset = {
      theme_primary: settings.theme_primary,
      theme_accent: settings.theme_accent,
      theme_bg_color: settings.theme_bg_color,
      theme_bg_image: settings.theme_bg_image,
      theme_bg_size: settings.theme_bg_size,
      theme_bg_repeat: settings.theme_bg_repeat,
      theme_bg_position: settings.theme_bg_position,
      theme_bg_attach: settings.theme_bg_attach,
      theme_shadow: settings.theme_shadow,
      theme_surface_mode: settings.theme_surface_mode,
      theme_radius_px: settings.theme_radius_px,
      theme_bg_overlay_color: settings.theme_bg_overlay_color,
      theme_bg_overlay_alpha: settings.theme_bg_overlay_alpha,
      theme_focus_mode: settings.theme_focus_mode,
      tags,
    }
    const nextMap = { ...map, [name]: subset }
    const s = await api('/settings', { method: 'PUT', body: JSON.stringify({ ...settings, theme_profiles: JSON.stringify(nextMap) }) })
    setSettings(s)
    applyTheme(s)
    setProfileName('')
    setProfileTags('')
    try { window.dispatchEvent(new CustomEvent('app-message', { detail: 'Perfil de tema guardado' })) } catch {}
  }

  const applyThemeProfile = async (name) => {
    let map = {}
    try { map = JSON.parse(settings.theme_profiles || '{}') } catch {}
    const prof = map[name]
    if (!prof) return
    const s = { ...settings, ...prof, theme_preset: '' }
    setSettings(s)
    applyTheme(s)
    try { window.dispatchEvent(new CustomEvent('app-message', { detail: `Perfil aplicado: ${name}` })) } catch {}
  }

  const deleteThemeProfile = async (name) => {
    let map = {}
    try { map = JSON.parse(settings.theme_profiles || '{}') } catch {}
    if (!map[name]) return
    const { [name]: _, ...rest } = map
    const s = await api('/settings', { method: 'PUT', body: JSON.stringify({ ...settings, theme_profiles: JSON.stringify(rest) }) })
    setSettings(s)
    applyTheme(s)
    try { window.dispatchEvent(new CustomEvent('app-message', { detail: `Perfil eliminado: ${name}` })) } catch {}
  }

  const duplicateThemeProfile = async (name) => {
    let map = {}
    try { map = JSON.parse(settings.theme_profiles || '{}') } catch {}
    const prof = map[name]
    if (!prof) return
    const newName = window.prompt('Nombre del nuevo perfil', `${name} copia`)
    const nn = (newName || '').trim()
    if (!nn) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Nombre inválido' })) } catch {}; return }
    if (map[nn]) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Ya existe un perfil con ese nombre' })) } catch {}; return }
    const s = await api('/settings', { method: 'PUT', body: JSON.stringify({ ...settings, theme_profiles: JSON.stringify({ ...map, [nn]: prof }) }) })
    setSettings(s)
    applyTheme(s)
    try { window.dispatchEvent(new CustomEvent('app-message', { detail: `Perfil duplicado: ${nn}` })) } catch {}
  }

  const renameThemeProfile = async (name) => {
    let map = {}
    try { map = JSON.parse(settings.theme_profiles || '{}') } catch {}
    const prof = map[name]
    if (!prof) return
    const newName = window.prompt('Nuevo nombre del perfil', name)
    const nn = (newName || '').trim()
    if (!nn) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Nombre inválido' })) } catch {}; return }
    if (nn === name) return
    if (map[nn]) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Ya existe un perfil con ese nombre' })) } catch {}; return }
    const { [name]: _, ...rest } = map
    const next = { ...rest, [nn]: prof }
    const s = await api('/settings', { method: 'PUT', body: JSON.stringify({ ...settings, theme_profiles: JSON.stringify(next) }) })
    setSettings(s)
    applyTheme(s)
    try { window.dispatchEvent(new CustomEvent('app-message', { detail: `Perfil renombrado: ${nn}` })) } catch {}
  }

  const renameThemeProfileTo = async (name, newName) => {
    let map = {}
    try { map = JSON.parse(settings.theme_profiles || '{}') } catch {}
    const prof = map[name]
    if (!prof) return
    const nn = (newName || '').trim()
    if (!nn) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Nombre inválido' })) } catch {}; return }
    if (nn === name) return
    if (map[nn]) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Ya existe un perfil con ese nombre' })) } catch {}; return }
    const { [name]: _, ...rest } = map
    const next = { ...rest, [nn]: prof }
    const s = await api('/settings', { method: 'PUT', body: JSON.stringify({ ...settings, theme_profiles: JSON.stringify(next) }) })
    setSettings(s)
    applyTheme(s)
    try { window.dispatchEvent(new CustomEvent('app-message', { detail: `Perfil renombrado: ${nn}` })) } catch {}
  }

  const startRenameProfile = (name) => { setRenameTarget(name); setRenameValue(name) }
  const cancelRenameProfile = () => { setRenameTarget(''); setRenameValue('') }

  const editProfileTags = async (name) => {
    let map = {}
    try { map = JSON.parse(settings.theme_profiles || '{}') } catch {}
    const prof = map[name]
    if (!prof) return
    const curr = Array.isArray(prof.tags) ? prof.tags.join(', ') : ''
    const input = window.prompt('Etiquetas (separadas por coma)', curr)
    if (input == null) return
    const tags = String(input).split(',').map(t => t.trim()).filter(Boolean)
    const next = { ...map, [name]: { ...prof, tags } }
    const s = await api('/settings', { method: 'PUT', body: JSON.stringify({ ...settings, theme_profiles: JSON.stringify(next) }) })
    setSettings(s)
    applyTheme(s)
    try { window.dispatchEvent(new CustomEvent('app-message', { detail: `Etiquetas actualizadas: ${name}` })) } catch {}
  }

  const refreshDemoInfo = async (opts = {}) => {
    try {
      const q = (() => {
        const p = new URLSearchParams()
        if (opts.from) p.set('from', opts.from)
        if (opts.to) p.set('to', opts.to)
        const s = p.toString()
        return s ? (`/reports/demo-summary?` + s) : '/reports/demo-summary'
      })()
      const r = await api(q)
      setDemoInfo(r)
      return
    } catch {}
    try {
      const s = await api('/settings')
      let ids = []
      try {
        const parsed = JSON.parse(s.demo_sales || '[]')
        ids = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' && Array.isArray(parsed.ids) ? parsed.ids : [])
      } catch {}
      let total = 0
      for (const id of ids) {
        const sale = await api(`/sales/${id}`)
        total += sale.total || 0
      }
      setDemoInfo({ demo: { count: ids.length, total }, real: { count: 0, total: 0 } })
    } catch {}
  }

  const applyTheme = (s) => {
    const root = document.documentElement
    if (s.theme_primary) root.style.setProperty('--primary', s.theme_primary)
    if (s.theme_accent) root.style.setProperty('--accent', s.theme_accent)
    const surfaceMode = String(s.theme_surface_mode || '').toLowerCase()
    if (surfaceMode === 'clara') { root.style.setProperty('--surface', '#ffffff'); root.style.setProperty('--border', '#e2e8f0') }
    if (surfaceMode === 'media') { root.style.setProperty('--surface', '#f8fafc'); root.style.setProperty('--border', '#cbd5e1') }
    if (surfaceMode === 'oscura') { root.style.setProperty('--surface', '#0f172a'); root.style.setProperty('--border', '#1f2937') }
    const radiusPx = parseInt(String(s.theme_radius_px || ''))
    if (!Number.isNaN(radiusPx)) root.style.setProperty('--radius', `${Math.max(0, Math.min(24, radiusPx))}px`)
    const shadowMap = {
      suave: '0 4px 12px rgba(2, 6, 23, 0.06)',
      media: '0 8px 24px rgba(2, 6, 23, 0.08)',
      fuerte: '0 12px 36px rgba(2, 6, 23, 0.12)',
      ninguna: '0 0 0 rgba(0,0,0,0)'
    }
    const shadowKey = String(s.theme_shadow || '').toLowerCase()
    if (shadowMap[shadowKey]) root.style.setProperty('--shadow', shadowMap[shadowKey])

    const body = document.body
    const hexToRgb = (h) => { const m = String(h).replace('#',''); const r = parseInt(m.slice(0,2),16)||0; const g = parseInt(m.slice(2,4),16)||0; const b = parseInt(m.slice(4,6),16)||0; return { r, g, b } }
    if (s.theme_bg_image) {
      const hasOverlay = !!s.theme_bg_overlay_color && String(s.theme_bg_overlay_alpha || '') !== ''
      if (hasOverlay) {
        try {
          const c = hexToRgb(s.theme_bg_overlay_color)
          const a = Math.max(0, Math.min(0.8, parseFloat(s.theme_bg_overlay_alpha || '0')))
          body.style.backgroundImage = `linear-gradient(rgba(${c.r},${c.g},${c.b},${a}), rgba(${c.r},${c.g},${c.b},${a})), url(${s.theme_bg_image})`
        } catch {
          body.style.backgroundImage = `url(${s.theme_bg_image})`
        }
      } else {
        body.style.backgroundImage = `url(${s.theme_bg_image})`
      }
      body.style.backgroundSize = (s.theme_bg_size || 'cover')
      body.style.backgroundRepeat = (s.theme_bg_repeat || 'no-repeat')
      body.style.backgroundAttachment = (s.theme_bg_attach || 'fixed')
      body.style.backgroundPosition = (s.theme_bg_position || 'center')
      if (s.theme_bg_color) body.style.backgroundColor = s.theme_bg_color
    } else {
      body.style.backgroundImage = ''
      body.style.backgroundSize = ''
      body.style.backgroundRepeat = ''
      body.style.backgroundAttachment = ''
      body.style.backgroundPosition = ''
      body.style.backgroundColor = s.theme_bg_color || ''
    }

    const focus = String(s.theme_focus_mode || '') === '1'
    if (focus) {
      root.style.setProperty('--shadow', shadowMap['ninguna'])
      body.style.backgroundImage = ''
      if (s.theme_bg_color) body.style.backgroundColor = s.theme_bg_color
    }
  }

  useEffect(() => {
    api('/settings').then(s => { setSettings(s); applyTheme(s) })
    refreshDemoInfo()
    ;(async () => { try { const me = await api('/auth/me'); setUser(me.user) } catch { setUser(null) } })()
  }, [])

  const doLogin = async () => {
    if (logging) return
    if (!username || !password) { setLoginError('Usuario y contraseña requeridos'); return }
    setLoginError('')
    setLogging(true)
    try {
      const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
      localStorage.setItem('token', r.token || '')
      setUser(r.user || null)
      setShowLogin(false)
      try { window.dispatchEvent(new CustomEvent('app-message', { detail: 'Sesión iniciada' })) } catch {}
    } catch (e) {
      setLoginError(String(e?.message || 'Error de autenticación'))
    } finally {
      setLogging(false)
    }
  }

  const computeRange = (preset) => {
    const now = new Date()
    if (preset === 'hoy') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return { from: start.toISOString(), to: now.toISOString() }
    }
    if (preset === 'semana') {
      const start = new Date(now)
      start.setDate(start.getDate() - 7)
      return { from: start.toISOString(), to: now.toISOString() }
    }
    if (preset === 'mes') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: start.toISOString(), to: now.toISOString() }
    }
    if (preset === 'todo') {
      return { from: new Date('1970-01-01').toISOString(), to: now.toISOString() }
    }
    return {}
  }

  const save = async () => {
    const s = await api('/settings', { method: 'PUT', body: JSON.stringify(settings) })
    setSettings(s)
    applyTheme(s)
    try { window.dispatchEvent(new CustomEvent('app-message', { detail: 'Configuración guardada' })) } catch {}
  }

  const generateTicketPreview = () => {
    const currency = settings.currency || 'MXN'
    const fmtMoney = new Intl.NumberFormat(undefined, { style: 'currency', currency })
    const ticketWidth = parseInt(settings.ticket_width || '80')
    const logoDataUrl = settings.logo_data_url || ''
    const logoSize = parseInt(settings.ticket_logo_size_mm || '20')
    const businessName = settings.business_name || 'PUNTO DE VENTA'
    const businessAddress = settings.business_address || ''
    const businessPhone = settings.business_phone || ''
    const businessEmail = settings.business_email || ''
    const businessRFC = settings.business_rfc || ''
    const ticketQrDataUrl = settings.ticket_qr_data_url || ''
    const ticketQrCaption = settings.ticket_qr_caption || ''
    const ticketQr2DataUrl = settings.ticket_qr2_data_url || ''
    const ticketQr2Caption = settings.ticket_qr2_caption || ''
    const ticketQrSize = parseInt(settings.ticket_qr_size_mm || String((ticketWidth <= 58) ? 26 : 32))
    const ticketFooter = settings.ticket_footer || ''
    const showContact = String(settings.credit_ticket_show_contact || '1') === '1'
    const showRFC = String(settings.credit_ticket_show_rfc || '1') === '1'
    const taxRate = parseFloat(settings.tax_rate || '0')
    const primary = settings.theme_primary || '#1e88e5'
    const accent = settings.theme_accent || '#e53935'
    const headerSize = parseInt(settings.ticket_font_header_size || '12')
    const bodySize = parseInt(settings.ticket_font_body_size || '10')
    const lineGap = parseInt(settings.ticket_line_gap_mm || '5')
    const compact = String(settings.ticket_compact_mode || '') === '1'
    const lineGapEff = compact ? Math.max(3, lineGap - 2) : lineGap
    const hex = (h) => { const m = String(h).replace('#',''); const r = parseInt(m.slice(0,2),16)||0; const g = parseInt(m.slice(2,4),16)||0; const b = parseInt(m.slice(4,6),16)||0; return { r, g, b } }

    const doc = new jsPDF({ unit: 'mm', format: [ticketWidth || 80, 240] })
    const pageW = doc.internal.pageSize.getWidth()
    let y = 10
    if (logoDataUrl) { try { const m = String(logoDataUrl).match(/^data:image\/(png|jpeg|jpg);/i); const fmt = (m?.[1] || 'PNG').toUpperCase().replace('JPG','JPEG'); const w = logoSize || 20; const x = (pageW - w) / 2; doc.addImage(logoDataUrl, fmt, x, y, w, w); y += (w + 2) } catch {} }
    doc.setFontSize(headerSize)
    try { const c = hex(primary); doc.setTextColor(c.r, c.g, c.b) } catch {}
    doc.text(businessName, pageW / 2, y, { align: 'center' }); y += 6
    try { doc.setTextColor(0,0,0) } catch {}
    doc.setFontSize(bodySize)
    if (businessAddress) { doc.text(String(businessAddress), pageW / 2, y, { align: 'center' }); y += lineGapEff }
    if (businessPhone) { doc.text(String(businessPhone), pageW / 2, y, { align: 'center' }); y += lineGapEff }
    if (businessEmail) { doc.text(String(businessEmail), pageW / 2, y, { align: 'center' }); y += lineGapEff }
    if (businessRFC) { doc.text(`RFC: ${businessRFC}`, pageW / 2, y, { align: 'center' }); y += lineGapEff }
    doc.text('Ticket #PREVIEW', pageW / 2, y, { align: 'center' }); y += 5
    {(() => { const d = new Date(); const pad = (n) => String(n).padStart(2, '0'); const dd = pad(d.getDate()); const mm = pad(d.getMonth() + 1); const yyyy = d.getFullYear(); const hh = pad(d.getHours()); const mi = pad(d.getMinutes()); const dfmt = (settings.date_format === 'mm/dd/yyyy') ? `${mm}/${dd}/${yyyy}` : (settings.date_format === 'yyyy-mm-dd') ? `${yyyy}-${mm}-${dd}` : `${dd}/${mm}/${yyyy}`; const is24 = String(settings.time_24h || '1') === '1'; const txt = is24 ? `${dfmt} ${hh}:${mi}` : `${dfmt} ${(d.getHours() % 12 || 12)}:${mi} ${d.getHours() < 12 ? 'AM' : 'PM'}`; doc.text(txt, pageW / 2, y, { align: 'center' }); y += 5 })()}
    if (previewCredit) {
      doc.setFontSize(10)
      doc.text('Venta con crédito', 10, y); y += 6
      doc.setFontSize(bodySize)
      doc.text('Cliente: Demo', pageW / 2, y, { align: 'center' }); y += 5
      if (showRFC) { doc.text('RFC: XAXX010101000', pageW / 2, y, { align: 'center' }); y += lineGapEff }
      if (showContact) { doc.text('Tel: 555-123-4567', pageW / 2, y, { align: 'center' }); y += lineGapEff; doc.text('demo@example.com', pageW / 2, y, { align: 'center' }); y += lineGapEff }
    }
    try { const c = hex(primary); doc.setDrawColor(c.r, c.g, c.b) } catch {}
    doc.line(8, y, pageW - 8, y); y += 4
    doc.setFontSize(10)
    doc.text('Cant', 10, y)
    doc.text('Producto', 26, y)
    doc.text('P.Unit', pageW - 28, y, { align: 'right' })
    doc.text('Importe', pageW - 8, y, { align: 'right' }); y += 5
    doc.line(8, y, pageW - 8, y); y += 4
    const maxDesc = (ticketWidth || 80) <= 58 ? 16 : 24
    const items = [
      { desc: 'Café Americano', qty: 1, price: 25.00 },
      { desc: 'Agua 600ml', qty: 2, price: 12.00 },
      { desc: 'Galletas Chocolate', qty: 1, price: 18.50 },
    ]
    let subtotal = 0
    for (const it of items) {
      const desc = String(it.desc).slice(0, maxDesc)
      const lineTotal = +(it.qty * it.price).toFixed(2)
      subtotal += lineTotal
      doc.text(String(it.qty), 10, y)
      doc.text(desc, 26, y)
      doc.text(fmtMoney.format(it.price), pageW - 28, y, { align: 'right' })
      doc.text(fmtMoney.format(lineTotal), pageW - 8, y, { align: 'right' })
      y += 5
    }
    doc.line(8, y, pageW - 8, y); y += 4
    const tax = +(subtotal * taxRate).toFixed(2)
    const total = +(subtotal + tax).toFixed(2)
    doc.text(`Subtotal: ${fmtMoney.format(subtotal)}`, pageW - 8, y, { align: 'right' }); y += lineGapEff
    doc.text(`IVA: ${fmtMoney.format(tax)}`, pageW - 8, y, { align: 'right' }); y += lineGapEff
    doc.setFontSize(headerSize)
    doc.text(`TOTAL: ${fmtMoney.format(total)}`, pageW - 8, y, { align: 'right' }); y += 8
    if (previewCredit) {
      doc.setFontSize(10)
      try { const c = hex(accent); doc.setTextColor(c.r, c.g, c.b) } catch {}
      doc.text('CRÉDITO', 10, y); y += 5
      try { const c = hex(primary); doc.setDrawColor(c.r, c.g, c.b) } catch {}
      doc.line(8, y, pageW - 8, y); y += 4
      try { doc.setTextColor(0,0,0) } catch {}
      doc.text('Pagos', 10, y); y += lineGapEff
      doc.text('credit', 10, y)
      doc.text(fmtMoney.format(total), pageW - 8, y, { align: 'right' })
      y += 5
    }
    if (ticketQrDataUrl) { try { const size = ticketQrSize || ((ticketWidth || 80) <= 58 ? 26 : 32); const x = (pageW - size) / 2; doc.addImage(ticketQrDataUrl, 'PNG', x, y, size, size); y += (size + 4); if (ticketQrCaption) { doc.setFontSize(10); doc.text(String(ticketQrCaption), pageW / 2, y, { align: 'center' }); y += 5 } } catch {} }
    if (ticketQr2DataUrl) { try { const size = ticketQrSize || ((ticketWidth || 80) <= 58 ? 26 : 32); const x = (pageW - size) / 2; doc.addImage(ticketQr2DataUrl, 'PNG', x, y, size, size); y += (size + 4); if (ticketQr2Caption) { doc.setFontSize(10); doc.text(String(ticketQr2Caption), pageW / 2, y, { align: 'center' }); y += 5 } } catch {} }
    if (ticketFooter) { doc.setFontSize(9); const lines = doc.splitTextToSize(String(ticketFooter), pageW - 16); doc.text(lines, pageW / 2, y, { align: 'center' }) }
    const uri = doc.output('datauristring')
    setPreviewUri(uri)
  }

  useEffect(() => {
    const t = setTimeout(() => { try { generateTicketPreview() } catch {} }, 300)
    return () => clearTimeout(t)
  }, [settings, previewCredit])

  useEffect(() => {
    const t = setTimeout(() => { try { generateTicketPreview() } catch {} }, 300)
    return () => clearTimeout(t)
  }, [dark, contrast])

  const seedDemo = async () => {
    if (seeding) return
    setSeeding(true)
    try {
      const map = await api('/settings')
      const taxRate = parseFloat(map.tax_rate || '0')
      const products = await api('/products')
      const customers = await api('/customers')
      const pick = (arr, n) => arr.slice(0, Math.max(0, Math.min(n, arr.length)))

      const ids = []
      const labels = []
      const sale1Items = pick(products, 2).map((p, i) => ({ product_id: p.id, quantity: i === 0 ? 1 : 2, unit_price: p.price }))
      const sale1Subtotal = sale1Items.reduce((a, it) => a + it.unit_price * it.quantity, 0)
      const sale1Tax = +(sale1Subtotal * taxRate).toFixed(2)
      const sale1Total = +(sale1Subtotal + sale1Tax).toFixed(2)
      const cash1 = +(sale1Total * 0.6).toFixed(2)
      const card1 = +(sale1Total - cash1).toFixed(2)
      const s1 = await api('/sales', { method: 'POST', body: JSON.stringify({ items: sale1Items, payment_method: 'cash', payments: [{ method: 'cash', amount: cash1 }, { method: 'card', amount: card1 }] }) })
      ids.push(s1.id)
      labels.push('Efectivo + Tarjeta')

      const cust = customers[0]?.id || null
      const sale2Items = pick(products.slice(2), 2).map((p, i) => ({ product_id: p.id, quantity: i === 0 ? 1 : 1, unit_price: p.price }))
      const sale2Subtotal = sale2Items.reduce((a, it) => a + it.unit_price * it.quantity, 0)
      const sale2Tax = +(sale2Subtotal * taxRate).toFixed(2)
      const sale2Total = +(sale2Subtotal + sale2Tax).toFixed(2)
      const cash2 = +(sale2Total * 0.3).toFixed(2)
      const credit2 = +(sale2Total - cash2).toFixed(2)
      const s2 = await api('/sales', { method: 'POST', body: JSON.stringify({ customer_id: cust, items: sale2Items, payment_method: 'cash', payments: [{ method: 'cash', amount: cash2 }, { method: 'credit', amount: credit2 }] }) })
      ids.push(s2.id)
      labels.push('Efectivo + Crédito')

      const sale3Items = pick(products.slice(4), 1).map((p) => ({ product_id: p.id, quantity: 3, unit_price: p.price }))
      const sale3Subtotal = sale3Items.reduce((a, it) => a + it.unit_price * it.quantity, 0)
      const sale3Tax = +(sale3Subtotal * taxRate).toFixed(2)
      const sale3Total = +(sale3Subtotal + sale3Tax).toFixed(2)
      const transfer3 = sale3Total
      const s3 = await api('/sales', { method: 'POST', body: JSON.stringify({ items: sale3Items, payment_method: 'transfer', payments: [{ method: 'transfer', amount: transfer3 }] }) })
      ids.push(s3.id)
      labels.push('Transferencia')

      const sale4Items = pick(products.slice(1, 4), 3).map((p, i) => ({ product_id: p.id, quantity: i + 1, unit_price: p.price }))
      const sale4Subtotal = sale4Items.reduce((a, it) => a + it.unit_price * it.quantity, 0)
      const sale4Tax = +(sale4Subtotal * taxRate).toFixed(2)
      const sale4TotalNoDiscount = +(sale4Subtotal + sale4Tax).toFixed(2)
      const discount4 = +(sale4TotalNoDiscount * 0.1).toFixed(2)
      const sale4Total = +(sale4TotalNoDiscount - discount4).toFixed(2)
      const cash4 = +(sale4Total * 0.2).toFixed(2)
      const card4 = +(sale4Total * 0.5).toFixed(2)
      const transfer4 = +(sale4Total - cash4 - card4).toFixed(2)
      const s4 = await api('/sales', { method: 'POST', body: JSON.stringify({ items: sale4Items, discount: discount4, payment_method: 'cash', payments: [{ method: 'cash', amount: cash4 }, { method: 'card', amount: card4 }, { method: 'transfer', amount: transfer4 }] }) })
      ids.push(s4.id)
      labels.push('3 métodos + descuento')

      await api('/settings', { method: 'PUT', body: JSON.stringify({ ...map, demo_sales: JSON.stringify({ ids, labels }) }) })

      try { window.dispatchEvent(new CustomEvent('app-message', { detail: 'Datos demo cargados' })) } catch {}
      await refreshDemoInfo()
    } catch (e) {
      // errores ya van al toast global
    } finally {
      setSeeding(false)
    }
  }

  const resetDemo = async () => {
    if (resetting) return
    setResetting(true)
    try {
      const r = await api('/sales/reset-demo', { method: 'POST' })
      try { window.dispatchEvent(new CustomEvent('app-message', { detail: `Datos demo reiniciados (${r.deleted})` })) } catch {}
      await refreshDemoInfo()
    } catch (e) {
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="container view">
      <h2>Configuración</h2>
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
        <button className="btn btn-ghost" title="Guía de configuración" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Ayuda de Configuración', text: 'Ajusta identidad del negocio, tema y apariencia, opciones de ticket y privacidad. Usa Modo sencillo para ocultar opciones avanzadas.' } })) } catch {} }}>Ayuda</button>
      </div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} title="Oculta opciones avanzadas para una configuración más simple">
            <input type="checkbox" checked={simpleMode} onChange={e => setSimpleMode(e.target.checked)} />
            Modo sencillo
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} title="Muestra íconos de ayuda junto a los controles">
            <input type="checkbox" checked={helpMode} onChange={e => setHelpMode(e.target.checked)} />
            Ayuda contextual
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} title="Reduce espaciados y tamaños para ver más contenido">
            <input type="checkbox" checked={compactUi} onChange={e => setCompactUi(e.target.checked)} />
            Vista compacta
          </label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn" onClick={save} title="Guardar configuración">Guardar configuración</button>
        </div>
      </div>
      <div id="cfg-index" className="card" style={{ position: 'sticky', top: 60, zIndex: 9, display: 'flex', alignItems: 'center', gap: compactIndex ? 6 : 8, flexWrap: 'wrap', marginBottom: 12, padding: compactIndex ? '8px 10px' : 16 }}>
        {!compactIndex && <span className="muted">Ir a:</span>}
        <button className={activeSection==='cfg-identidad'?'btn':'btn btn-ghost'} style={{ ...(compactIndex ? { padding: '6px 10px' } : {}), ...(activeSection==='cfg-identidad'?{ background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }:{}) }} onClick={() => scrollTo('cfg-identidad')} title="Identidad">Identidad</button>
        <button className={activeSection==='cfg-fecha'?'btn':'btn btn-ghost'} style={{ ...(compactIndex ? { padding: '6px 10px' } : {}), ...(activeSection==='cfg-fecha'?{ background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }:{}) }} onClick={() => scrollTo('cfg-fecha')} title="Fecha y hora">Fecha y hora</button>
        <button className={activeSection==='cfg-reportes'?'btn':'btn btn-ghost'} style={{ ...(compactIndex ? { padding: '6px 10px' } : {}), ...(activeSection==='cfg-reportes'?{ background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }:{}) }} onClick={() => scrollTo('cfg-reportes')} title="Reportes">Reportes</button>
        <button className={activeSection==='cfg-tema'?'btn':'btn btn-ghost'} style={{ ...(compactIndex ? { padding: '6px 10px' } : {}), ...(activeSection==='cfg-tema'?{ background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }:{}) }} onClick={() => scrollTo('cfg-tema')} title="Tema y apariencia">Tema</button>
        <button className={activeSection==='cfg-ticket'?'btn':'btn btn-ghost'} style={{ ...(compactIndex ? { padding: '6px 10px' } : {}), ...(activeSection==='cfg-ticket'?{ background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }:{}) }} onClick={() => scrollTo('cfg-ticket')} title="Ticket">Ticket</button>
        <button className={activeSection==='cfg-previsualizacion'?'btn':'btn btn-ghost'} style={{ ...(compactIndex ? { padding: '6px 10px' } : {}), ...(activeSection==='cfg-previsualizacion'?{ background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }:{}) }} onClick={() => scrollTo('cfg-previsualizacion')} title="Previsualización">Previsualización</button>
        <button className={activeSection==='cfg-privacidad'?'btn':'btn btn-ghost'} style={{ ...(compactIndex ? { padding: '6px 10px' } : {}), ...(activeSection==='cfg-privacidad'?{ background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }:{}) }} onClick={() => scrollTo('cfg-privacidad')} title="Privacidad">Privacidad</button>
      </div>
      <div className="section" id="cfg-identidad">
        <div className="card">
          <h3>Identidad del negocio</h3>
          <div className="muted" style={{ marginTop: 4 }}>Nombre, contacto y RFC se muestran en el ticket.</div>
          {helpMode && <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Información de identidad" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Identidad del negocio', text: 'Estos datos aparecen en el ticket: nombre, contacto y RFC. Manténlos actualizados.' } })) } catch {} }}><IconInfo /></button>}
          <div className="grid-2" style={{ marginTop: 8 }}>
            <div className="field"><span className="label">Nombre</span><input placeholder="Ej. Mi Tienda" value={settings.business_name || ''} onChange={e => setSettings({ ...settings, business_name: e.target.value })} title="Nombre comercial mostrado en el ticket" /></div>
            <div className="field"><span className="label">Moneda</span><input placeholder="MXN" value={settings.currency || ''} onChange={e => setSettings({ ...settings, currency: e.target.value })} title="Código de moneda (ej. MXN)" /></div>
            <div className="field"><span className="label">RFC</span><input placeholder="XAXX010101000" value={settings.business_rfc || ''} onChange={e => setSettings({ ...settings, business_rfc: e.target.value })} title="RFC del negocio" /></div>
            <div className="field"><span className="label">Teléfono</span><input placeholder="+52 55 1234 5678" value={settings.business_phone || ''} onChange={e => setSettings({ ...settings, business_phone: e.target.value })} title="Teléfono de contacto" /></div>
            <div className="field"><span className="label">Email</span><input placeholder="usuario@dominio.com" value={settings.business_email || ''} onChange={e => setSettings({ ...settings, business_email: e.target.value })} title="Correo de contacto" /></div>
            <div className="field"><span className="label">Dirección</span><input placeholder="Calle, número, colonia, ciudad" value={settings.business_address || ''} onChange={e => setSettings({ ...settings, business_address: e.target.value })} title="Dirección del negocio" /></div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <span className="label">Logo</span>
              <div className="row">
                {settings.logo_data_url && <img src={settings.logo_data_url} alt="logo" className="preview" />}
                <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const s = { ...settings, logo_data_url: String(r.result || '') }; setSettings(s); }; r.readAsDataURL(f) }} title="Cargar logo" />
              </div>
              <span className="hint">Recomendado: imagen cuadrada, fondo transparente</span>
            </div>
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={() => scrollTo('cfg-index')} title="Volver al índice">Regresar arriba</button>
        </div>
      </div>

      <div className="section" id="cfg-fecha" style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
        <div className="card">
          <h3>Formato de fecha y hora</h3>
          <div className="row" style={{ gap: 8, alignItems: 'center', marginTop: 6 }}>
            <select value={settings.date_format || 'dd/mm/yyyy'} onChange={e => setSettings({ ...settings, date_format: e.target.value })} title="Formato de fecha">
              <option value="dd/mm/yyyy">DD/MM/AAAA</option>
              <option value="mm/dd/yyyy">MM/DD/AAAA</option>
              <option value="yyyy-mm-dd">AAAA-MM-DD</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={String(settings.time_24h || '1') === '1'} onChange={e => setSettings({ ...settings, time_24h: e.target.checked ? '1' : '0' })} />
              Reloj 24h
            </label>
            <button className="btn" onClick={save} title="Guardar formato">Guardar</button>
          </div>
          <div className="muted" style={{ marginTop: 6 }}>Afecta fechas en Reportes, tablas y ticket. Si desactivas 24h, se mostrará AM/PM.</div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={() => scrollTo('cfg-index')} title="Volver al índice">Regresar arriba</button>
        </div>
      </div>

      <div className="section" id="cfg-reportes" style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
        <div className="card">
          <h3>Preferencias de Reportes</h3>
          <div className="muted" style={{ marginTop: 4 }}>Controla confirmación al restablecer y ayuda contextual.</div>
          <div className="row" style={{ gap: 8, alignItems: 'center', marginTop: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }} title="Mostrar confirmación al restablecer la vista">
              <input type="checkbox" checked={(() => { try { return localStorage.getItem('report-reset-skip-confirm') !== '1' } catch { return true } })()} onChange={e => { const v = e.target.checked; try { if (v) localStorage.removeItem('report-reset-skip-confirm'); else localStorage.setItem('report-reset-skip-confirm', '1') } catch {} }} />
              Pedir confirmación al restablecer vista
            </label>
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={() => scrollTo('cfg-index')} title="Volver al índice">Regresar arriba</button>
        </div>
      </div>

      <div className="section" id="cfg-tema" style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
        <div className="card">
          <h3>Tema y apariencia</h3>
          <div className="muted" style={{ marginTop: 4 }}>Ajusta colores y fondo. Modo sencillo oculta opciones avanzadas.</div>
          {helpMode && <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Personaliza el aspecto" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Tema y apariencia', text: 'Configura colores y fondo. Usa Modo sencillo para centrarte en lo esencial.' } })) } catch {} }}><IconInfo /></button>}
          <div className="grid-2" style={{ marginTop: 8 }}>
            <div className="field">
              <span className="label">Tema</span>
              <select value={settings.theme_preset || ''} onChange={e => { const val = e.target.value; const presets = { oceano: { theme_primary: '#0ea5e9', theme_accent: '#22d3ee', theme_bg_color: '#f8fafc' }, esmeralda: { theme_primary: '#10b981', theme_accent: '#34d399', theme_bg_color: '#f8fafc' }, ambar: { theme_primary: '#f59e0b', theme_accent: '#f97316', theme_bg_color: '#fff7ed' }, cereza: { theme_primary: '#e11d48', theme_accent: '#f43f5e', theme_bg_color: '#fef2f2' }, violeta: { theme_primary: '#7c3aed', theme_accent: '#a78bfa', theme_bg_color: '#f5f3ff' }, grafito: { theme_primary: '#374151', theme_accent: '#10b981', theme_bg_color: '#f3f4f6' }, noche: { theme_primary: '#111827', theme_accent: '#2563eb', theme_bg_color: '#0b1020' }, pastel: { theme_primary: '#60a5fa', theme_accent: '#f59e0b', theme_bg_color: '#fdf2f8' }, selva: { theme_primary: '#065f46', theme_accent: '#22c55e', theme_bg_color: '#ecfdf5' }, neon: { theme_primary: '#06b6d4', theme_accent: '#f43f5e', theme_bg_color: '#0b132b' }, arena: { theme_primary: '#d97706', theme_accent: '#a3e635', theme_bg_color: '#fef3c7' }, }; const next = { ...settings, theme_preset: val, ...(presets[val] || {}) }; setSettings(next); applyTheme(next) }}>
                <option value="">Predeterminado</option>
                <option value="oceano">Océano</option>
                <option value="esmeralda">Esmeralda</option>
                <option value="ambar">Ámbar</option>
                <option value="cereza">Cereza</option>
                <option value="violeta">Violeta</option>
                <option value="grafito">Grafito</option>
                <option value="noche">Noche</option>
                <option value="pastel">Pastel</option>
                <option value="selva">Selva</option>
                <option value="neon">Neón</option>
                <option value="arena">Arena</option>
              </select>
            </div>
            <div className="field"><span className="label">Superficie</span>
              <select value={settings.theme_surface_mode || ''} onChange={e => { const s = { ...settings, theme_surface_mode: e.target.value }; setSettings(s); applyTheme(s) }} title="Color base de tarjetas y controles">
                <option value="">Automático</option>
                <option value="clara">Clara</option>
                <option value="media">Media</option>
                <option value="oscura">Oscura</option>
              </select>
            </div>
            <div className="field"><span className="label">IVA</span><input type="number" step="0.01" value={settings.tax_rate || 0} onChange={e => setSettings({ ...settings, tax_rate: e.target.value })} /></div>
            <div className="field"><span className="label">Color primario</span><input title="Color primario" type="color" value={settings.theme_primary || '#1e88e5'} onChange={e => { const s = { ...settings, theme_primary: e.target.value }; setSettings(s); applyTheme(s) }} /></div>
            <div className="field"><span className="label">Color acento</span><input title="Color acento" type="color" value={settings.theme_accent || '#e53935'} onChange={e => { const s = { ...settings, theme_accent: e.target.value }; setSettings(s); applyTheme(s) }} /></div>
            <div className="field"><span className="label">Color de fondo</span><input type="color" value={settings.theme_bg_color || '#ffffff'} onChange={e => { const s = { ...settings, theme_bg_color: e.target.value }; setSettings(s); applyTheme(s) }} title="Color de fondo cuando no hay imagen" /></div>
            <div className="field"><span className="label">Redondeado (px)</span><input type="number" step="1" min="0" max="24" value={settings.theme_radius_px ?? 10} onChange={e => { const s = { ...settings, theme_radius_px: e.target.value }; setSettings(s); applyTheme(s) }} title="Radio global de bordes" /></div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <span className="label">Fondo</span>
              <div className="row">
                {settings.theme_bg_image && <img src={settings.theme_bg_image} alt="fondo" className="preview" />}
                <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const s = { ...settings, theme_bg_image: String(r.result || '') }; setSettings(s); applyTheme(s) }; r.readAsDataURL(f) }} title="Cargar imagen de fondo" />
                {simpleMode ? null : (<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, width: '100%' }}>
                  <div className="field"><span className="label">Tamaño</span>
                    <select value={settings.theme_bg_size || 'cover'} onChange={e => { const s = { ...settings, theme_bg_size: e.target.value }; setSettings(s); applyTheme(s) }} title="Modo de ajuste de imagen">
                      <option value="cover">Cubrir</option>
                      <option value="contain">Contener</option>
                    </select>
                  </div>
                  <div className="field"><span className="label">Repetición</span>
                    <select value={settings.theme_bg_repeat || 'no-repeat'} onChange={e => { const s = { ...settings, theme_bg_repeat: e.target.value }; setSettings(s); applyTheme(s) }} title="Repetir imagen de fondo">
                      <option value="no-repeat">No repetir</option>
                      <option value="repeat">Repetir</option>
                    </select>
                  </div>
                  <div className="field"><span className="label">Posición</span>
                    <select value={settings.theme_bg_position || 'center'} onChange={e => { const s = { ...settings, theme_bg_position: e.target.value }; setSettings(s); applyTheme(s) }} title="Posición de la imagen">
                      <option value="center">Centro</option>
                      <option value="top">Arriba</option>
                      <option value="bottom">Abajo</option>
                    </select>
                  </div>
                  <div className="field"><span className="label">Adjuntar</span>
                    <select value={settings.theme_bg_attach || 'fixed'} onChange={e => { const s = { ...settings, theme_bg_attach: e.target.value }; setSettings(s); applyTheme(s) }} title="Comportamiento al hacer scroll">
                      <option value="fixed">Fijo</option>
                      <option value="scroll">Con scroll</option>
                    </select>
                  </div>
                  <div className="field"><span className="label">Overlay color</span>
                    <input type="color" value={settings.theme_bg_overlay_color || '#000000'} onChange={e => { const s = { ...settings, theme_bg_overlay_color: e.target.value }; setSettings(s); applyTheme(s) }} title="Color semitransparente sobre el fondo" />
                  </div>
                  <div className="field"><span className="label">Overlay opacidad</span>
                    <input type="number" step="0.05" min="0" max="0.8" value={settings.theme_bg_overlay_alpha ?? 0} onChange={e => { const s = { ...settings, theme_bg_overlay_alpha: e.target.value }; setSettings(s); applyTheme(s) }} title="Opacidad del overlay (0 a 0.8)" />
                  </div>
                  <div className="field" style={{ gridColumn: 'span 2' }}>
                    <span className="label">Sombra</span>
                    <select value={settings.theme_shadow || 'media'} onChange={e => { const s = { ...settings, theme_shadow: e.target.value }; setSettings(s); applyTheme(s) }} title="Intensidad de sombra global">
                      <option value="suave">Suave</option>
                      <option value="media">Media</option>
                      <option value="fuerte">Fuerte</option>
                      <option value="ninguna">Ninguna</option>
                    </select>
                  </div>
                  {!simpleMode && (
                    <div className="field" style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={String(settings.theme_focus_mode || '') === '1'} onChange={e => { const s = { ...settings, theme_focus_mode: e.target.checked ? '1' : '0' }; setSettings(s); applyTheme(s) }} />
                        Modo sin distracciones (fondo liso, sombra mínima)
                      </label>
                    </div>
                  )}
                </div>
                )}
              </div>
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <span className="label">Perfiles de tema</span>
              {simpleMode ? null : (<div className="row" style={{ alignItems: 'stretch' }}>
                <input placeholder="Nombre del perfil" value={profileName} onChange={e => setProfileName(e.target.value)} style={{ maxWidth: 200 }} title="Nombre para guardar el perfil" />
                <input placeholder="Etiquetas (coma)" value={profileTags} onChange={e => setProfileTags(e.target.value)} style={{ maxWidth: 200 }} title="Etiquetas separadas por coma" />
                <button className="btn" onClick={saveThemeProfile} title="Guardar perfil actual">Guardar perfil</button>
                {Object.keys(themeProfileMap).length > 0 ? (
                  <>
                    <select value="" onChange={e => applyThemeProfile(e.target.value)} title="Aplicar un perfil guardado" style={{ maxWidth: 180 }}>
                      <option value="">Selecciona perfil</option>
                      {Object.keys(themeProfileMap).map(n => (<option key={n} value={n}>{n}</option>))}
                    </select>
                    <select value="" onChange={e => deleteThemeProfile(e.target.value)} title="Eliminar un perfil" style={{ maxWidth: 180 }}>
                      <option value="">Eliminar perfil</option>
                      {Object.keys(themeProfileMap).map(n => (<option key={n} value={n}>{n}</option>))}
                    </select>
                    <input placeholder="Buscar perfil" value={profileQuery} onChange={e => setProfileQuery(e.target.value)} style={{ maxWidth: 180 }} title="Buscar por nombre" />
                    <input placeholder="Filtrar etiqueta" value={profileTagFilter} onChange={e => setProfileTagFilter(e.target.value)} style={{ maxWidth: 180 }} title="Filtrar por etiqueta" />
                    <select value={profileSort} onChange={e => setProfileSort(e.target.value)} title="Ordenar perfiles" style={{ maxWidth: 160 }}>
                      <option value="az">A-Z</option>
                      <option value="za">Z-A</option>
                    </select>
                  </>
                ) : null}
              </div>
              )}
              {!simpleMode && filteredProfileNames.length > 0 ? <ProfileCards /> : null}
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }} title="Leer códigos automáticamente desde el campo SKU"><input type="checkbox" checked={String(settings.auto_scan || '') === '1'} onChange={e => setSettings({ ...settings, auto_scan: e.target.checked ? '1' : '0' })} />Escaneo automático</label>
            </div>
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={() => scrollTo('cfg-index')} title="Volver al índice">Regresar arriba</button>
        </div>
      </div>

      <div className="section" id="cfg-ticket" style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
        <div className="card">
          <h3>Ticket</h3>
          <div className="muted" style={{ marginTop: 4 }}>Configura tamaños y elementos para una lectura clara.</div>
          {helpMode && <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Ajustes del ticket" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Ticket', text: 'Controla ancho, tamaños de fuente y espaciado, logos y QR. Usa modo compacto para tickets más cortos.' } })) } catch {} }}><IconInfo /></button>}
          <div className="grid-2" style={{ marginTop: 8 }}>
            <div className="field">
              <span className="label">Ancho</span>
              <select value={settings.ticket_width || '80'} onChange={e => setSettings({ ...settings, ticket_width: e.target.value })} title="Ancho del papel del ticket">
                <option value="58">58mm</option>
                <option value="80">80mm</option>
              </select>
            </div>
            <div className="field"><span className="label">Tamaño logo (mm)</span><input type="number" step="1" min="10" max="40" value={settings.ticket_logo_size_mm || 20} onChange={e => setSettings({ ...settings, ticket_logo_size_mm: e.target.value })} title="Tamaño del logo en el ticket" /></div>
            <div className="field"><span className="label">Tamaño fuente (encabezado)</span><input type="number" step="1" min="10" max="16" value={settings.ticket_font_header_size || 12} onChange={e => setSettings({ ...settings, ticket_font_header_size: e.target.value })} title="Tamaño de texto para el encabezado" /></div>
            <div className="field"><span className="label">Tamaño fuente (cuerpo)</span><input type="number" step="1" min="8" max="14" value={settings.ticket_font_body_size || 10} onChange={e => setSettings({ ...settings, ticket_font_body_size: e.target.value })} title="Tamaño de texto para el cuerpo" /></div>
            <div className="field"><span className="label">Espaciado líneas (mm)</span><input type="number" step="1" min="4" max="8" value={settings.ticket_line_gap_mm || 5} onChange={e => setSettings({ ...settings, ticket_line_gap_mm: e.target.value })} title="Separación vertical entre líneas" /></div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={String(settings.ticket_compact_mode || '') === '1'} onChange={e => setSettings({ ...settings, ticket_compact_mode: e.target.checked ? '1' : '0' })} />
                Modo compacto (menos espaciado)
              </label>
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <span className="label">QR principal</span>
              <div className="row">
                {settings.ticket_qr_data_url && <img src={settings.ticket_qr_data_url} alt="qr1" className="preview" />}
                <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const s = { ...settings, ticket_qr_data_url: String(r.result || '') }; setSettings(s); }; r.readAsDataURL(f) }} title="Cargar QR principal" />
              </div>
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}><span className="label">Texto bajo QR</span><input value={settings.ticket_qr_caption || ''} onChange={e => setSettings({ ...settings, ticket_qr_caption: e.target.value })} title="Texto descriptivo bajo el QR" /></div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <span className="label">Segundo QR</span>
              <div className="row">
                {settings.ticket_qr2_data_url && <img src={settings.ticket_qr2_data_url} alt="qr2" className="preview" />}
                <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const s = { ...settings, ticket_qr2_data_url: String(r.result || '') }; setSettings(s); }; r.readAsDataURL(f) }} title="Cargar segundo QR" />
              </div>
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}><span className="label">Texto bajo segundo QR</span><input value={settings.ticket_qr2_caption || ''} onChange={e => setSettings({ ...settings, ticket_qr2_caption: e.target.value })} title="Texto descriptivo bajo el segundo QR" /></div>
            <div className="field"><span className="label">Tamaño QR (mm)</span><input type="number" step="1" min="16" max="60" value={settings.ticket_qr_size_mm || 32} onChange={e => setSettings({ ...settings, ticket_qr_size_mm: e.target.value })} title="Tamaño de los códigos QR" /></div>
            <div className="field" style={{ gridColumn: 'span 2' }}><span className="label">Pie del ticket</span><textarea value={settings.ticket_footer || ''} onChange={e => setSettings({ ...settings, ticket_footer: e.target.value })} style={{ minHeight: 64 }} title="Texto que aparece al final del ticket" /></div>
            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={save} title="Guardar configuración">Guardar</button>
            </div>
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={() => scrollTo('cfg-index')} title="Volver al índice">Regresar arriba</button>
        </div>
      </div>

      <div className="section" id="cfg-previsualizacion" style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
        <div className="card">
          <h3>Previsualización del ticket</h3>
          <div className="muted" style={{ marginTop: 4 }}>Genera una vista para validar ajustes antes de guardar.</div>
          {helpMode && <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Ver cómo quedará" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Previsualización', text: 'Genera una vista del ticket con ajustes actuales. Activa “Simular venta con crédito” para ver datos del cliente.' } })) } catch {} }}><IconInfo /></button>}
          <div className="row" style={{ marginTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }} title="Incluye datos del cliente cuando la venta usa crédito">
              <input type="checkbox" checked={previewCredit} onChange={e => setPreviewCredit(e.target.checked)} />
              Simular venta con crédito
            </label>
            <button className="btn" onClick={generateTicketPreview} title="Actualizar la previsualización">Generar vista</button>
          </div>
          {previewUri && (
            <div style={{ marginTop: 10 }}>
              <iframe title="preview-ticket" src={previewUri} style={{ width: '100%', height: 420, border: '1px solid var(--border)', borderRadius: '8px' }} />
            </div>
          )}
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={() => scrollTo('cfg-index')} title="Volver al índice">Regresar arriba</button>
        </div>
      </div>

      <div className="section" id="cfg-privacidad" style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
        <div className="card">
          <h3>Privacidad y opciones</h3>
          <div className="muted" style={{ marginTop: 4 }}>Elige qué datos del cliente mostrar en tickets con crédito.</div>
          {helpMode && <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Datos en tickets de crédito" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Privacidad', text: 'Elige si mostrar teléfono, email y RFC del cliente en tickets de ventas con crédito.' } })) } catch {} }}><IconInfo /></button>}
          <div className="grid-2" style={{ marginTop: 8 }}>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={String(settings.credit_ticket_show_contact || '') === '1'} onChange={e => setSettings({ ...settings, credit_ticket_show_contact: e.target.checked ? '1' : '0' })} />
                Mostrar teléfono y email en tickets de crédito
              </label>
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={String(settings.credit_ticket_show_rfc || '') === '1'} onChange={e => setSettings({ ...settings, credit_ticket_show_rfc: e.target.checked ? '1' : '0' })} />
                Mostrar RFC del cliente en tickets de crédito
              </label>
            </div>
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={() => scrollTo('cfg-index')} title="Volver al índice">Regresar arriba</button>
        </div>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <h3>Autenticación</h3>
        <div className="muted">Requerido para registrar pagos de adeudos</div>
        {user && !showLogin && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
            <span>Usuario: {user.username} ({user.role})</span>
            <button className="btn" onClick={() => setShowLogin(true)} title="Cambiar al usuario administrador">Cambiar usuario</button>
            <button className="btn btn-ghost" onClick={() => { localStorage.removeItem('token'); setUser(null); setShowLogin(false); try { window.dispatchEvent(new CustomEvent('app-message', { detail: 'Sesión cerrada' })) } catch {} }} title="Cerrar sesión actual">Cerrar sesión</button>
          </div>
        )}
        {(!user || showLogin) && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
            <input placeholder="Usuario" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') doLogin() }} style={{ maxWidth: 160 }} title="Nombre de usuario" />
            <input placeholder="Contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') doLogin() }} style={{ maxWidth: 160 }} title="Contraseña" />
            <button className="btn" disabled={!username || !password || logging} onClick={doLogin} title="Iniciar sesión">{logging ? 'Entrando...' : 'Entrar'}</button>
            {showLogin && <button className="btn btn-ghost" onClick={() => { setShowLogin(false); setLoginError('') }} title="Cancelar inicio de sesión">Cancelar</button>}
            {loginError && <span className="accent">{loginError}</span>}
          </div>
        )}
      </div>
      <div className="card" style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h4>Datos de ejemplo</h4>
          <div className="muted">Genera ventas de prueba con pagos múltiples y crédito</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
            <select value={range} onChange={e => { const v = e.target.value; setRange(v); localStorage.setItem('last-demo-range', v); if (v !== 'custom') { localStorage.removeItem('last-demo-from'); localStorage.removeItem('last-demo-to') } const r = computeRange(v); refreshDemoInfo(r) }} title="Rango para resumen demo">
              <option value="todo">Todo</option>
              <option value="hoy">Hoy</option>
              <option value="semana">7 días</option>
              <option value="mes">Mes actual</option>
              <option value="custom">Personalizado</option>
            </select>
            {range === 'custom' && (
              <>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} title="Desde" />
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} title="Hasta" />
                <button className="btn" onClick={() => {
                  const f = fromDate ? new Date(fromDate + 'T00:00:00').toISOString() : undefined
                  const t = toDate ? new Date(toDate + 'T23:59:59').toISOString() : undefined
                  localStorage.setItem('last-demo-range', 'custom')
                  localStorage.setItem('last-demo-from', f || '')
                  localStorage.setItem('last-demo-to', t || '')
                  refreshDemoInfo({ from: f, to: t })
                }} title="Aplicar rango">Aplicar</button>
              </>
            )}
          </div>
          {(() => { try {
            const r = localStorage.getItem('last-demo-range') || 'todo'
            let f = '', t = ''
            if (r === 'custom') {
              f = localStorage.getItem('last-demo-from') || ''
              t = localStorage.getItem('last-demo-to') || ''
            } else {
              const cr = computeRange(r)
              f = cr.from || ''
              t = cr.to || ''
            }
            if (!f || !t) return null
            const fmt = (iso, showTime) => { const d = new Date(iso); const pad = (n) => String(n).padStart(2, '0'); const dd = pad(d.getDate()); const mm = pad(d.getMonth() + 1); const yyyy = d.getFullYear(); const hh = pad(d.getHours()); const mi = pad(d.getMinutes()); const dfmt = (settings.date_format === 'mm/dd/yyyy') ? `${mm}/${dd}/${yyyy}` : (settings.date_format === 'yyyy-mm-dd') ? `${yyyy}-${mm}-${dd}` : `${dd}/${mm}/${yyyy}`; if (!showTime) return dfmt; const t24 = String(settings.time_24h || '1') === '1'; if (t24) return `${dfmt} ${hh}:${mi}`; const h12 = d.getHours() % 12 || 12; const ampm = d.getHours() < 12 ? 'AM' : 'PM'; return `${dfmt} ${h12}:${mi} ${ampm}` }
            const df = fmt(f, r === 'hoy')
            const dt = fmt(t, r === 'hoy')
            const label = (r === 'hoy' ? 'Hoy' : r === 'semana' ? '7 días' : r === 'mes' ? 'Mes actual' : r === 'custom' ? 'Personalizado' : 'Todo')
            return (<div className="muted" style={{ marginTop: 4 }}>Rango aplicado: {label} · {df} – {dt}</div>)
          } catch { return null } })()}
          {(() => { try {
            const d = JSON.parse(settings.demo_sales || '[]')
            const ids = Array.isArray(d) ? d : (d && typeof d === 'object' && Array.isArray(d.ids) ? d.ids : [])
            const labels = Array.isArray(d) ? [] : (d && typeof d === 'object' && Array.isArray(d.labels) ? d.labels : [])
            return (
              <div style={{ marginTop: 6 }}>
                <span className="muted">Ventas demo actuales: {ids.length}</span>
                <div style={{ marginTop: 6 }}>
                  {(() => {
                    const currency = settings.currency || 'MXN'
                    const fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency })
                    return (
                      <div className="muted">Ingresos demo: {fmt.format(demoInfo.demo.total || 0)} · Reales: {fmt.format(demoInfo.real.total || 0)}</div>
                    )
                  })()}
                </div>
                {labels.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    {labels.map((l, i) => (
                      <span key={i} className="btn" style={{ padding: '6px 10px' }}>{l}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          } catch { return null } })()}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={seedDemo} disabled={seeding} title="Generar ventas de ejemplo">{seeding ? 'Cargando...' : 'Cargar datos demo'}</button>
          <button className="btn btn-ghost" onClick={resetDemo} disabled={resetting} title="Borrar ventas de ejemplo">{resetting ? 'Reseteando...' : 'Reset demo'}</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('ventas')
  const [dark, setDark] = useState(false)
  const [contrast, setContrast] = useState(false)
  const [compact, setCompact] = useState(false)
  const [toast, setToast] = useState('')
  const [brandName, setBrandName] = useState('')
  const [logoSrc, setLogoSrc] = useState('')
  const [cashOpen, setCashOpen] = useState(false)
  const [cashEstimate, setCashEstimate] = useState(null)
  const [help, setHelp] = useState(null)
  const [helpMode, setHelpMode] = useState(() => { try { return localStorage.getItem('config-help-mode') !== '0' } catch { return true } })
  const [backendDown, setBackendDown] = useState(false)
  const [themeProfiles, setThemeProfiles] = useState({})
  const [themeProfileSel, setThemeProfileSel] = useState('')
  
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const savedTheme = localStorage.getItem('theme')
    const savedContrast = localStorage.getItem('contrast')
    const savedCompact = localStorage.getItem('compact')
    if (savedTheme === 'dark') setDark(true)
    else if (savedTheme === 'light') setDark(false)
    else setDark(mq.matches)
    setContrast(savedContrast === '1')
    setCompact(savedCompact === '1')
    const apply = () => { if (!savedTheme) setDark(mq.matches) }
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => { (async () => { try { const s = await api('/settings'); setBrandName(s.business_name || ''); setLogoSrc(s.logo_data_url || ''); try { const map = JSON.parse(s.theme_profiles || '{}'); if (map && typeof map === 'object') setThemeProfiles(map) } catch {} } catch {} })() }, [])
  const refreshCashStatus = async () => { try { const st = await api('/cash/status'); setCashOpen(!!st.session); if (st.session) { try { const movs = await api('/cash/movements'); const sale = movs.filter(m => m.type === 'sale').reduce((s, m) => s + (m.amount || 0), 0); const dep = movs.filter(m => m.type === 'deposit').reduce((s, m) => s + (m.amount || 0), 0); const ret = movs.filter(m => m.type === 'withdraw').reduce((s, m) => s + (m.amount || 0), 0); setCashEstimate((st.session.opening_balance || 0) + sale + dep + ret) } catch { setCashEstimate(null) } } else { setCashEstimate(null) } } catch { setCashOpen(false); setCashEstimate(null) } }
  useEffect(() => { refreshCashStatus() }, [])
  useEffect(() => { const t = setInterval(() => { refreshCashStatus() }, 60000); return () => clearInterval(t) }, [])
  useEffect(() => { const h = () => { refreshCashStatus() }; window.addEventListener('cash-status', h); return () => window.removeEventListener('cash-status', h) }, [])
  useEffect(() => {
    const onKey = (e) => {
      try {
        if (tab !== 'reportes') return
        const k = String(e.key).toLowerCase()
        if (e.altKey && k === 'o') { e.preventDefault(); try { window.dispatchEvent(new CustomEvent('reportes-open-cash')) } catch {} return }
        if (e.altKey && k === 'c') { e.preventDefault(); try { window.dispatchEvent(new CustomEvent('reportes-close-cash')) } catch {} return }
        if (e.altKey && k === 'x') { e.preventDefault(); try { window.dispatchEvent(new CustomEvent('reportes-export-all-excel')) } catch {} return }
        if (e.altKey && k === 'f') { e.preventDefault(); try { window.dispatchEvent(new CustomEvent('reportes-export-filtered-excel')) } catch {} return }
      } catch {}
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tab])

  useEffect(() => {
    const root = document.documentElement
    if (contrast) root.setAttribute('data-theme', 'contrast')
    else if (dark) root.setAttribute('data-theme', 'dark')
    else root.removeAttribute('data-theme')
    root.setAttribute('data-compact', compact ? '1' : '0')
    localStorage.setItem('contrast', contrast ? '1' : '0')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    localStorage.setItem('compact', compact ? '1' : '0')
  }, [dark, contrast, compact])

  useEffect(() => {
    const onErr = (e) => {
      const msg = typeof e.detail === 'string' ? e.detail : 'Error'
      setToast(msg)
      if (msg.toLowerCase().includes('red') || msg.toLowerCase().includes('network')) setBackendDown(true)
      const t = setTimeout(() => setToast(''), 4500)
      return () => clearTimeout(t)
    }
    window.addEventListener('app-error', onErr)
    const onMsg = (e) => {
      setToast(typeof e.detail === 'string' ? e.detail : 'Hecho')
      const t = setTimeout(() => setToast(''), 3500)
      return () => clearTimeout(t)
    }
    window.addEventListener('app-message', onMsg)
    return () => { window.removeEventListener('app-error', onErr); window.removeEventListener('app-message', onMsg) }
  }, [])

  useEffect(() => {
    const onHelp = (e) => { const d = e?.detail || {}; const t = typeof d === 'string' ? { title: 'Ayuda', text: d } : d; setHelp(t) }
    window.addEventListener('app-help', onHelp)
    return () => window.removeEventListener('app-help', onHelp)
  }, [])
  
  const applyThemeQuick = (s) => {
    const root = document.documentElement
    if (s.theme_primary) root.style.setProperty('--primary', s.theme_primary)
    if (s.theme_accent) root.style.setProperty('--accent', s.theme_accent)
    const surfaceMode = String(s.theme_surface_mode || '').toLowerCase()
    if (surfaceMode === 'clara') { root.style.setProperty('--surface', '#ffffff'); root.style.setProperty('--border', '#e2e8f0') }
    if (surfaceMode === 'media') { root.style.setProperty('--surface', '#f8fafc'); root.style.setProperty('--border', '#cbd5e1') }
    if (surfaceMode === 'oscura') { root.style.setProperty('--surface', '#0f172a'); root.style.setProperty('--border', '#1f2937') }
    const radiusPx = parseInt(String(s.theme_radius_px || ''))
    if (!Number.isNaN(radiusPx)) root.style.setProperty('--radius', `${Math.max(0, Math.min(24, radiusPx))}px`)
    const shadowMap = { suave: '0 4px 12px rgba(2, 6, 23, 0.06)', media: '0 8px 24px rgba(2, 6, 23, 0.08)', fuerte: '0 12px 36px rgba(2, 6, 23, 0.12)', ninguna: '0 0 0 rgba(0,0,0,0)' }
    const shadowKey = String(s.theme_shadow || '').toLowerCase()
    if (shadowMap[shadowKey]) root.style.setProperty('--shadow', shadowMap[shadowKey])
    const body = document.body
    const hexToRgb = (h) => { const m = String(h).replace('#',''); const r = parseInt(m.slice(0,2),16)||0; const g = parseInt(m.slice(2,4),16)||0; const b = parseInt(m.slice(4,6),16)||0; return { r, g, b } }
    if (s.theme_bg_image) {
      const hasOverlay = !!s.theme_bg_overlay_color && String(s.theme_bg_overlay_alpha || '') !== ''
      if (hasOverlay) {
        try { const c = hexToRgb(s.theme_bg_overlay_color); const a = Math.max(0, Math.min(0.8, parseFloat(s.theme_bg_overlay_alpha || '0'))); body.style.backgroundImage = `linear-gradient(rgba(${c.r},${c.g},${c.b},${a}), rgba(${c.r},${c.g},${c.b},${a})), url(${s.theme_bg_image})` } catch { body.style.backgroundImage = `url(${s.theme_bg_image})` }
      } else { body.style.backgroundImage = `url(${s.theme_bg_image})` }
      body.style.backgroundSize = (s.theme_bg_size || 'cover')
      body.style.backgroundRepeat = (s.theme_bg_repeat || 'no-repeat')
      body.style.backgroundAttachment = (s.theme_bg_attach || 'fixed')
      body.style.backgroundPosition = (s.theme_bg_position || 'center')
      if (s.theme_bg_color) body.style.backgroundColor = s.theme_bg_color
    } else {
      body.style.backgroundImage = ''
      body.style.backgroundSize = ''
      body.style.backgroundRepeat = ''
      body.style.backgroundAttachment = ''
      body.style.backgroundPosition = ''
      body.style.backgroundColor = s.theme_bg_color || ''
    }
    const focus = String(s.theme_focus_mode || '') === '1'
    if (focus) { root.style.setProperty('--shadow', shadowMap['ninguna']); body.style.backgroundImage = ''; if (s.theme_bg_color) body.style.backgroundColor = s.theme_bg_color }
  }

  const onApplyThemeProfile = async (name) => {
    if (!name) return
    try {
      const settings = await api('/settings')
      let map = {}
      try { map = JSON.parse(settings.theme_profiles || '{}') } catch {}
      const prof = map[name]
      if (!prof) return
      const s = await api('/settings', { method: 'PUT', body: JSON.stringify({ ...settings, ...prof, theme_preset: '' }) })
      applyThemeQuick(s)
      setThemeProfileSel(name)
      try { localStorage.setItem('last-theme-profile', name) } catch {}
      try { window.dispatchEvent(new CustomEvent('app-message', { detail: `Tema aplicado: ${name}` })) } catch {}
    } catch {}
  }

  const onDuplicateThemeProfile = async (name) => {
    try {
      const settings = await api('/settings')
      let map = {}
      try { map = JSON.parse(settings.theme_profiles || '{}') } catch {}
      const prof = map[name]
      if (!prof) return
      const newName = window.prompt('Nombre del nuevo perfil', `${name} copia`)
      const nn = (newName || '').trim()
      if (!nn) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Nombre inválido' })) } catch {}; return }
      if (map[nn]) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Ya existe un perfil con ese nombre' })) } catch {}; return }
      const next = { ...map, [nn]: prof }
      const s = await api('/settings', { method: 'PUT', body: JSON.stringify({ ...settings, theme_profiles: JSON.stringify(next) }) })
      try { const updated = JSON.parse(s.theme_profiles || '{}'); setThemeProfiles(updated) } catch {}
      try { window.dispatchEvent(new CustomEvent('app-message', { detail: `Perfil duplicado: ${nn}` })) } catch {}
    } catch {}
  }

  const onRenameThemeProfile = async (name, nn) => {
    try {
      const settings = await api('/settings')
      let map = {}
      try { map = JSON.parse(settings.theme_profiles || '{}') } catch {}
      const prof = map[name]
      if (!prof) return
      const newName = (nn || '').trim()
      if (!newName) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Nombre inválido' })) } catch {}; return }
      if (newName === name) return
      if (map[newName]) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Ya existe un perfil con ese nombre' })) } catch {}; return }
      const { [name]: _, ...rest } = map
      const next = { ...rest, [newName]: prof }
      const s = await api('/settings', { method: 'PUT', body: JSON.stringify({ ...settings, theme_profiles: JSON.stringify(next) }) })
      try { const updated = JSON.parse(s.theme_profiles || '{}'); setThemeProfiles(updated) } catch {}
      try { window.dispatchEvent(new CustomEvent('app-message', { detail: `Perfil renombrado: ${newName}` })) } catch {}
    } catch {}
  }

  const onDeleteThemeProfile = async (name) => {
    try {
      const settings = await api('/settings')
      let map = {}
      try { map = JSON.parse(settings.theme_profiles || '{}') } catch {}
      if (!map[name]) return
      const { [name]: _, ...rest } = map
      const s = await api('/settings', { method: 'PUT', body: JSON.stringify({ ...settings, theme_profiles: JSON.stringify(rest) }) })
      try { const updated = JSON.parse(s.theme_profiles || '{}'); setThemeProfiles(updated) } catch {}
      try { window.dispatchEvent(new CustomEvent('app-message', { detail: `Perfil eliminado: ${name}` })) } catch {}
    } catch {}
  }

  const onToggleTheme = () => setDark(v => !v)
  const onToggleContrast = () => setContrast(v => !v)
  const onToggleCompact = () => setCompact(v => !v)
  const onToggleHelpMode = () => { const next = !helpMode; setHelpMode(next); try { localStorage.setItem('config-help-mode', next ? '1' : '0'); window.dispatchEvent(new CustomEvent('app-message', { detail: next ? 'Ayudas activadas' : 'Ayudas desactivadas' })) } catch {} }
  const refreshBackendStatus = async () => { try { await api('/settings'); setBackendDown(false); try { window.dispatchEvent(new CustomEvent('app-message', { detail: 'Conectado' })) } catch {} } catch { setBackendDown(true) } }
  
  return (
    <div>
      <Toolbar tab={tab} setTab={setTab} onToggleTheme={onToggleTheme} dark={dark} brandName={brandName} logoSrc={logoSrc} cashOpen={cashOpen} cashEstimate={cashEstimate} onRefreshCash={refreshCashStatus} themeProfiles={themeProfiles} themeProfileSel={themeProfileSel} onApplyThemeProfile={onApplyThemeProfile} onDuplicateThemeProfile={onDuplicateThemeProfile} onRenameThemeProfile={onRenameThemeProfile} onDeleteThemeProfile={onDeleteThemeProfile} />
      {backendDown && (
        <div className="toast" style={{ left: 12, right: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Servidor desconectado</span>
            <button className="btn" onClick={refreshBackendStatus} title="Intentar reconectar">Reintentar</button>
          </div>
        </div>
      )}
      <div style={{ position: 'fixed', top: 10, right: 90, display: 'flex', gap: 6 }}>
        <button className="btn" onClick={onToggleContrast} title="Mejora legibilidad con alto contraste">{contrast ? 'Normal' : 'Contraste'}</button>
        <button className="btn" onClick={onToggleCompact} title="Modo compacto para espacios reducidos">{compact ? 'Normal' : 'Compacto'}</button>
        <button className="btn" onClick={onToggleHelpMode} title="Mostrar/ocultar ayudas contextuales">{helpMode ? 'Ayudas ON' : 'Ayudas OFF'}</button>
      </div>
      {toast && <div className="toast" onClick={() => setToast('')}>{toast}</div>}
      {help && (
        <div className="modal-overlay">
          <div className="card modal">
            <h3>{help.title || 'Ayuda'}</h3>
            <div className="muted">
              {String(help.text || '').split('\n').map((x,i)=>(<div key={i}>{x}</div>))}
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setHelp(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
      {tab === 'ventas' && <Ventas />}
      {tab === 'productos' && <Productos />}
      {tab === 'clientes' && <Clientes />}
      {tab === 'reportes' && <Reportes />}
      {tab === 'config' && <Config dark={dark} contrast={contrast} />}
    </div>
  )
}
