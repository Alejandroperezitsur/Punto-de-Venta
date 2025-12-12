import React, { useEffect, useMemo, useState } from 'react'
import jsPDF from 'jspdf'
import { api } from '../lib/api'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Modal from '../components/ui/Modal'
import Skeleton from '../components/ui/Skeleton'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import { IconInfo } from '../components/ui/icons'

export default function Reportes() {
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
  const onSort = (k) => { if (sortKey === k) { setSortDir(sortDir === 'asc' ? 'desc' : 'asc') } else { setSortKey(k); setSortDir(k === 'date' || k === 'time' || k === 'total' || k === 'id' ? 'desc' : 'asc') } }
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
    const fmt2 = (iso) => {
      const d = new Date(iso)
      const y = d.getFullYear()
      const m = String(d.getMonth()+1).padStart(2,'0')
      const day = String(d.getDate()).padStart(2,'0')
      return `${y}-${m}-${day}`
    }
    const suffix = (last.from && last.to) ? `${fmt2(last.from)}_a_${fmt2(last.to)}` : range
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
    } catch {}
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
  const removeSale = async (id) => { try { const ok = window.confirm(`Eliminar venta #${id}?`); if (!ok) return; await api(`/sales/${id}`, { method: 'DELETE' }); try { window.dispatchEvent(new CustomEvent('app-message', { detail: `Venta ${id} eliminada` })) } catch {}; await load({ from: last.from || undefined, to: last.to || undefined }) } catch {} }
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
      if (logoDataUrl) { try { const m = String(logoDataUrl).match(/^data:image\/(png|jpeg|jpg);/i); const fmt2 = (m?.[1] || 'PNG').toUpperCase().replace('JPG','JPEG'); const w = logoSize || 20; const x = (pageW - w) / 2; doc.addImage(logoDataUrl, fmt2, x, y, w, w); y += (w + 2) } catch {} }
      doc.setFontSize(ticketHeaderSize)
      doc.text(businessName || 'PUNTO DE VENTA', pageW / 2, y, { align: 'center' }); y += 6
      doc.setFontSize(ticketBodySize)
      if (businessAddress) { doc.text(String(businessAddress), pageW / 2, y, { align: 'center' }); y += gap }
      if (businessPhone) { doc.text(String(businessPhone), pageW / 2, y, { align: 'center' }); y += gap }
      if (businessEmail) { doc.text(String(businessEmail), pageW / 2, y, { align: 'center' }); y += gap }
      if (businessRFC) { doc.text(`RFC: ${businessRFC}`, pageW / 2, y, { align: 'center' }); y += gap }
      doc.text(`Ticket #${detail.id}`, pageW / 2, y, { align: 'center' }); y += gap
      doc.text((() => { const iso = detail.created_at; const d = new Date(iso); const pad = (n) => String(n).padStart(2, '0'); const dd = pad(d.getDate()); const mm = pad(d.getMonth() + 1); const yyyy = d.getFullYear(); const hh = pad(d.getHours()); const mi = pad(d.getMinutes()); const dateStr = (dateFmt === 'mm/dd/yyyy') ? `${mm}/${dd}/${yyyy}` : (dateFmt === 'yyyy-mm-dd') ? `${yyyy}-${mm}-${dd}` : `${dd}/${mm}/${yyyy}`; if (time24) return `${dateStr} ${hh}:${mi}`; const h12 = d.getHours() % 12 || 12; const ampm = d.getHours() < 12 ? 'AM' : 'PM'; return `${dateStr} ${h12}:${mi} ${ampm}` })(), pageW / 2, y, { align: 'center' }); y += gap
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
      <Breadcrumbs items={["Administración","Reportes"]} />
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
        <Button variant="ghost" title="Guía de reportes" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Ayuda de Reportes', text: 'Genera resúmenes y exporta ventas a Excel. Usa filtros de fecha y cliente para delimitar. Atajos: Alt+O abre caja, Alt+C cierra caja, Alt+X exporta todo, Alt+F exporta lo filtrado.' } })) } catch {} }}>Ayuda</Button>
      </div>
      <Card style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, justifyContent: 'space-between' }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={range} onChange={e => { const v = e.target.value; setRange(v); localStorage.setItem('last-demo-range', v); if (v !== 'custom') { localStorage.removeItem('last-demo-from'); localStorage.removeItem('last-demo-to'); } load(computeRange(v)) }} title="Selecciona el rango de fechas">
              <option value="todo">Todo</option>
              <option value="hoy">Hoy</option>
              <option value="semana">7 días</option>
              <option value="mes">Mes actual</option>
              <option value="custom">Personalizado</option>
            </select>
            <button className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Cómo filtrar por fecha" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Filtros de fecha', text: 'Elige un rango predefinido o personaliza con fechas Desde/Hasta y presiona Aplicar.' } })) } catch {} }}><IconInfo /></button>
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
          {(() => { const f = last?.from; const t = last?.to; if (!f || !t) return null; const fmt3 = (iso, showTime) => { const d = new Date(iso); const pad = (n) => String(n).padStart(2, '0'); const dd = pad(d.getDate()); const mm = pad(d.getMonth() + 1); const yyyy = d.getFullYear(); const hh = pad(d.getHours()); const mi = pad(d.getMinutes()); const dateStr = (dateFmt === 'mm/dd/yyyy') ? `${mm}/${dd}/${yyyy}` : (dateFmt === 'yyyy-mm-dd') ? `${yyyy}-${mm}-${dd}` : `${dd}/${mm}/${yyyy}`; if (!showTime) return dateStr; if (time24) return `${dateStr} ${hh}:${mi}`; const h12 = d.getHours() % 12 || 12; const ampm = d.getHours() < 12 ? 'AM' : 'PM'; return `${dateStr} ${h12}:${mi} ${ampm}` }; const df = fmt3(f, range === 'hoy'); const dt = fmt3(t, range === 'hoy'); const label = (range === 'hoy' ? 'Hoy' : range === 'semana' ? '7 días' : range === 'mes' ? 'Mes actual' : range === 'custom' ? 'Personalizado' : 'Todo'); return (<div className="muted">Rango aplicado: {label} · {df} – {dt}</div>) })()}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={exportAll} title="Exporta CSV de resumen, clientes y productos">Exportar todo</Button>
          <Button onClick={exportAllExcel} title="Exporta todo en formato Excel">Exportar todo (Excel)</Button>
          <Button onClick={exportSalesDetail} title="Exporta detalle de cada venta">Exportar ventas (detalle)</Button>
          <Button variant="ghost" style={{ padding: '6px 10px' }} title="Ayuda de exportación" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Exportación', text: 'Usa Exportar todo para un resumen general. Exportar ventas (detalle) incluye ítems y pagos por venta.' } })) } catch {} }}><IconInfo /></Button>
          <Button onClick={openResetConfirm} title="Limpiar filtros, rango y orden" style={{ background: 'var(--accent, #e53935)', color: '#fff' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 3 L3 21 H21 Z" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
                <path d="M12 9 V14" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="17" r="1.5" fill="#fff" />
              </svg>
              <span>Restablecer vista</span>
            </span>
          </Button>
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card>
          <h4>Resumen</h4>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={exportSummary} title="Exportar resumen como CSV">Exportar CSV</Button>
          </div>
          <div style={{ marginTop: 8 }}>
            <div>Ventas: {summary.count}</div>
            <div>Total: {fmt.format(summary.total || 0)}</div>
          </div>
        </Card>
        <Card>
          <h4>Por cliente</h4>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={exportCustomers} title="Exportar tabla de clientes como CSV">Exportar CSV</Button>
          </div>
          <Table
            columns={[
              { title: 'Cliente', render: (c) => (c.name || 'Sin cliente') },
              { title: 'Ventas', render: (c) => (<span className="right">{c.count}</span>) },
              { title: 'Total', render: (c) => (<span className="right">{fmt.format(c.total || 0)}</span>) }
            ]}
            rows={customers}
            filterable={true}
            pageSize={20}
          />
        </Card>
      </div>
      <Card style={{ marginTop: 12 }}>
        <h4>Por producto</h4>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={exportProducts}>Exportar CSV</Button>
        </div>
        <Table
          columns={[
            { title: 'ID', key: 'product_id' },
            { title: 'Producto', key: 'name' },
            { title: 'Cant', render: (r) => (<span className="right">{r.qty}</span>) },
            { title: 'Total', render: (r) => (<span className="right">{fmt.format(r.total || 0)}</span>) }
          ]}
          rows={products}
          filterable={true}
          pageSize={20}
          stickyFirst={true}
        />
      </Card>
      <Card style={{ marginTop: 12 }}>
        <h4>Caja</h4>
        <Button variant="ghost" style={{ padding: '6px 10px', marginTop: 6 }} title="Ayuda de caja" onClick={() => { try { window.dispatchEvent(new CustomEvent('app-help', { detail: { title: 'Caja', text: 'Abre una sesión de caja para registrar depósitos, retiros y ventas en efectivo. Puedes cerrar la caja desde aquí o con Alt+C en esta pestaña.' } })) } catch {} }}><IconInfo /></Button>
        {cashLoading && <Skeleton lines={2} />}
        {!cashLoading && cashError && <div className="accent">{cashError}</div>}
        {!cashLoading && !cashError && !cashSession && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input placeholder="Saldo inicial" type="number" step="0.01" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} style={{ maxWidth: 160 }} title="Monto inicial de la caja" />
            <Button onClick={openCash} title="Abrir sesión de caja">Abrir caja</Button>
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
              <Button onClick={depositCash} title="Registrar depósito">Depositar</Button>
              <input placeholder="Retiro" type="number" step="0.01" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} style={{ maxWidth: 140 }} title="Monto a retirar" />
              <Button onClick={withdrawCash} title="Registrar retiro">Retirar</Button>
              <div className="spacer" />
              <Button variant="ghost" onClick={closeCash} title="Cerrar sesión de caja">Cerrar caja</Button>
            </div>
            <Table
              columns={[
                { title: 'Tipo', key: 'type' },
                { title: 'Referencia', render: (m) => (m.reference || '-') },
                { title: 'Monto', render: (m) => (<span className="right">{fmt.format(m.amount || 0)}</span>) },
                { title: 'Fecha', render: (m) => formatDate(m.created_at) }
              ]}
              rows={cashMovements}
            />
          </div>
        )}
      </Card>
      <Card style={{ marginTop: 12 }}>
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
              <Input type="date" value={recentFrom} onChange={e => setRecentFrom(e.target.value)} title="Fecha inicio" />
              <Input type="date" value={recentTo} onChange={e => setRecentTo(e.target.value)} title="Fecha fin" />
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
          <Input placeholder="Cliente (ID o nombre)" value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} title="Filtra por cliente" />
          <Button onClick={exportFilteredSalesDetail}>Exportar filtradas</Button>
          <Button onClick={exportTotalsByMethod}>Exportar totales método</Button>
          <Button onClick={exportFilteredSalesExcel}>Exportar filtradas (Excel)</Button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={onlyCredit} onChange={e => setOnlyCredit(e.target.checked)} />Solo crédito</label>
        </div>
        <div className="muted" style={{ marginTop: 6 }}>
          {(() => { const total = filteredSales.reduce((s, x) => s + (x.total || 0), 0); return `Ventas filtradas: ${filteredSales.length} · Total: ${fmtMoney.format(total)}` })()}
        </div>
        <div className="muted" style={{ marginTop: 6 }}>
          {(() => { const keys = Object.keys(totalsByMethod); if (totalsLoading) return 'Calculando...'; if (!keys.length) return 'Sin totales por método'; return keys.map(k => `${k}: ${fmtMoney.format(totalsByMethod[k] || 0)}`).join(' · ') })()}
        </div>
        <div style={{ marginTop: 8 }}>
          <Table
            columns={(() => {
              const cols = [
                { title: (<span style={{ cursor: 'pointer' }} onClick={() => onSort('id')} title="Ordenar por ID">ID {sortKey === 'id' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>), key: 'id' },
                { title: (<span style={{ cursor: 'pointer' }} onClick={() => onSort('date')} title="Ordenar por fecha">Fecha {sortKey === 'date' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>), render: (s) => formatDate(s.created_at) },
              ]
              if (!time24) cols.push({ title: (<span className="hide-sm" style={{ cursor: 'pointer' }} onClick={() => onSort('time')} title="Ordenar por hora">Hora {sortKey === 'time' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>), render: (s) => (<span className="hide-sm">{formatTime(s.created_at)}</span>) })
              cols.push({ title: (<span style={{ cursor: 'pointer' }} onClick={() => onSort('customer')} title="Ordenar por cliente">Cliente {sortKey === 'customer' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>), render: (s) => { const c = customersFull.find(c => String(c.id) === String(s.customer_id)); return c?.name || (s.customer_id || '-') } })
              cols.push({ title: (<span className="hide-sm" style={{ cursor: 'pointer' }} onClick={() => onSort('method')} title="Ordenar por método">Método {sortKey === 'method' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>), render: (s) => (<span className="hide-sm">{s.payment_method || '-'}{creditSaleIds[s.id] ? <span className="badge badge-accent" style={{ marginLeft: 6 }}>CRÉDITO</span> : null}</span>) })
              cols.push({ title: (<span className="right" style={{ cursor: 'pointer' }} onClick={() => onSort('total')} title="Ordenar por total">Total {sortKey === 'total' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>), render: (s) => (<span className="right">{fmtMoney.format(s.total || 0)}</span>) })
              cols.push({ title: '', render: (s) => (
                <div className="right cell-nowrap">
                  <Button onClick={() => reprint(s.id)} title="Reimprimir ticket en PDF">Ticket PDF</Button>
                  <Button onClick={() => openPayments(s.id)} title="Ver pagos de la venta">Pagos</Button>
                  <Button style={{ background: 'var(--accent, #e53935)', color: '#fff' }} onClick={() => removeSale(s.id)} title="Eliminar venta">Eliminar</Button>
                </div>
              ) })
              return cols
            })()}
            rows={(() => {
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
            })()}
            filterable={true}
            pageSize={20}
            stickyFirst={true}
          />
          {filteredSalesFinal.length === 0 && <div className="muted">Sin ventas en el rango</div>}
        </div>
        <Modal open={!!payModalId} title={`Pagos venta #${payModalId || ''}`} onClose={closePayments}>
          {payModalLoading && <div className="muted">Cargando...</div>}
          {!payModalLoading && payModalData && (
            <>
              <div className="muted">Fecha: {formatDate(payModalData.created_at)}</div>
              <Table
                columns={[
                  { title: 'Método', key: 'method' },
                  { title: 'Usuario', render: (p) => (p.username || '-') },
                  { title: 'Monto', render: (p) => (<span className="right">{fmtMoney.format(p.amount || 0)}</span>) }
                ]}
                rows={(Array.isArray(payModalData.payments) ? payModalData.payments : [])}
              />
              <div className="modal-actions">
                <Button onClick={closePayments}>Cerrar</Button>
              </div>
            </>
          )}
        </Modal>
        <Modal open={resetConfirmOpen} title="Restablecer vista" onClose={closeResetConfirm}>
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
            <Button variant="ghost" onClick={closeResetConfirm}>Cancelar</Button>
            <Button style={{ background: 'var(--accent, #e53935)', color: '#fff' }} onClick={resetReportsView}>Restablecer</Button>
          </div>
        </Modal>
      </Card>
    </div>
  )
}
