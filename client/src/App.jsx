import React, { useEffect, useMemo, useState } from 'react'
import jsPDF from 'jspdf'

const API = 'http://localhost:3001/api'

async function api(path, options) {
  let res
  try {
    res = await fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      ...options,
    })
  } catch (e) {
    try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Error de red' })) } catch {}
    throw e
  }
  if (!res.ok) {
    const msg = await res.text()
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

function Toolbar({ tab, setTab, onToggleTheme, dark }) {
  const tabs = [
    ['ventas', 'Ventas'],
    ['productos', 'Productos'],
    ['clientes', 'Clientes'],
    ['config', 'Configuración'],
  ]
  return (
    <div className="toolbar">
      <div className="brand"><svg className="logo" viewBox="0 0 24 24"><path d="M4 6h16v2H4zm2 4h12v2H6zm3 4h6v2H9z"/></svg>Punto de Venta</div>
      <div className="spacer" />
      {tabs.map(([key, label]) => (
        <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
          {key === 'ventas' && <IconVentas />}
          {key === 'productos' && <IconProductos />}
          {key === 'clientes' && <IconClientes />}
          {key === 'config' && <IconConfig />}
          <span style={{ marginLeft: 6 }}>{label}</span>
        </button>
      ))}
      <div className="actions">
        <button className="btn" onClick={onToggleTheme}>{dark ? 'Claro' : 'Oscuro'}</button>
      </div>
    </div>
  )
}

function Productos() {
  const [list, setList] = useState([])
  const [form, setForm] = useState({ name: '', sku: '', price: 0, stock: 0 })
  const [loading, setLoading] = useState(false)
  const [currency, setCurrency] = useState('MXN')

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
    await api(`/products/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="container view">
      <h2>Productos</h2>
      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        <input placeholder="Nombre" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input placeholder="SKU" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
        <input placeholder="Precio" type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })} />
        <input placeholder="Stock" type="number" step="0.001" value={form.stock} onChange={e => setForm({ ...form, stock: +e.target.value })} />
        <div style={{ gridColumn: 'span 4', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={save} disabled={loading}>Guardar</button>
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
              <td><button className="btn btn-ghost" onClick={() => remove(p.id)}>Eliminar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Clientes() {
  const [list, setList] = useState([])
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [loading, setLoading] = useState(false)
  const load = async () => setList(await api('/customers'))
  useEffect(() => { load() }, [])
  const save = async () => { setLoading(true); await api('/customers', { method: 'POST', body: JSON.stringify(form) }); setForm({ name: '', phone: '', email: '' }); await load(); setLoading(false) }
  const remove = async (id) => { await api(`/customers/${id}`, { method: 'DELETE' }); await load() }
  return (
    <div className="container view">
      <h2>Clientes</h2>
      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
        <input placeholder="Nombre" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Teléfono" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={save} disabled={loading}>Guardar</button>
        </div>
      </div>
      <table className="table" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>ID</th><th>Nombre</th><th>Teléfono</th><th>Email</th><th></th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 && (
            <tr><td colSpan="5">Sin clientes</td></tr>
          )}
          {list.map(c => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.name}</td>
              <td>{c.phone}</td>
              <td>{c.email}</td>
              <td><button className="btn btn-ghost" onClick={() => remove(c.id)}>Eliminar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Ventas() {
  const [products, setProducts] = useState([])
  const [productFilter, setProductFilter] = useState('')
  const [cart, setCart] = useState([])
  const [customerId, setCustomerId] = useState('')
  const [payments, setPayments] = useState([{ method: 'cash', amount: 0 }])
  const [currency, setCurrency] = useState('MXN')
  const [taxRate, setTaxRate] = useState(0.16)

  useEffect(() => { api('/settings').then(s => { setCurrency(s.currency || 'MXN'); setTaxRate(+s.tax_rate || 0.16) }) }, [])
  const fmt = useMemo(() => new Intl.NumberFormat(undefined, { style: 'currency', currency }), [currency])

  const loadProducts = async () => setProducts(await api('/products'))
  useEffect(() => { loadProducts() }, [])

  const addToCart = (p) => {
    const existing = cart.find(i => i.product_id === p.id)
    if (existing) setCart(cart.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i))
    else setCart([...cart, { product_id: p.id, name: p.name, unit_price: p.price, quantity: 1 }])
  }

  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, i) => acc + i.unit_price * i.quantity, 0)
    const tax = +(subtotal * taxRate).toFixed(2)
    const total = +(subtotal + tax).toFixed(2)
    return { subtotal, tax, total }
  }, [cart])

  const payTotal = useMemo(() => payments.reduce((acc, p) => acc + (p.amount || 0), 0), [payments])
  const hasCredit = useMemo(() => payments.some(p => p.method === 'credit' && p.amount > 0), [payments])

  const checkout = async () => {
    if (!cart.length) return
    const items = cart.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price }))
    const payList = payments.filter(p => p.amount > 0)
    const sale = await api('/sales', { method: 'POST', body: JSON.stringify({ customer_id: customerId || null, items, payment_method: (payList[0]?.method || 'cash'), payments: payList }) })
    const confirmPrint = window.confirm(`Venta #${sale.id} total ${fmt.format(sale.total)}. ¿Imprimir ticket PDF?`)
    if (confirmPrint) {
      const doc = new jsPDF({ unit: 'mm', format: 'ticket' })
      let y = 10
      doc.setFontSize(12)
      doc.text('PUNTO DE VENTA', 10, y); y += 6
      doc.setFontSize(10)
      doc.text(`Ticket #${sale.id}`, 10, y); y += 6
      doc.text(new Date(sale.created_at).toLocaleString(), 10, y); y += 6
      doc.line(10, y, 80, y); y += 4
      for (const it of sale.items) {
        doc.text(`${it.quantity} x ${fmt.format(it.unit_price)}  ${fmt.format(it.line_total)}`, 10, y); y += 5
      }
      doc.line(10, y, 80, y); y += 4
      doc.text(`Subtotal: ${fmt.format(sale.subtotal)}`, 10, y); y += 5
      doc.text(`IVA: ${fmt.format(sale.tax)}`, 10, y); y += 5
      if (sale.discount) { doc.text(`Descuento: ${fmt.format(sale.discount)}`, 10, y); y += 5 }
      doc.setFontSize(12)
      doc.text(`TOTAL: ${fmt.format(sale.total)}`, 10, y); y += 8
      doc.save(`ticket_${sale.id}.pdf`)
    }
    setCart([])
    setPayments([{ method: 'cash', amount: 0 }])
    await loadProducts()
  }

  return (
    <div className="container view">
      <h2>Ventas</h2>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 2 }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <input placeholder="Buscar producto" value={productFilter} onChange={e => setProductFilter(e.target.value)} style={{ maxWidth: 240 }} />
            </div>
            <table className="table">
              <thead><tr><th>ID</th><th>Nombre</th><th className="right">Precio</th><th className="right">Stock</th><th></th></tr></thead>
              <tbody>
                {products.filter(p => {
                  const q = productFilter.trim().toLowerCase()
                  if (!q) return true
                  return (p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
                }).map(p => (
                  <tr key={p.id}>
                    <td>{p.id}</td><td>{p.name}</td><td className="right">{fmt.format(p.price)}</td><td className="right">{p.stock}</td>
                    <td><button className="btn" onClick={() => addToCart(p)}>Agregar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="card" style={{ marginBottom: 12 }}>
            <h3>Carrito</h3>
            <table className="table">
              <thead><tr><th>Producto</th><th>Cant</th><th className="right">Precio</th><th></th></tr></thead>
              <tbody>
                {cart.map((i, idx) => (
                  <tr key={idx}>
                    <td>{i.name}</td>
                    <td className="right">{i.quantity}</td>
                    <td className="right">{fmt.format(i.unit_price * i.quantity)}</td>
                    <td className="right">
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn" onClick={() => setCart(cart.map((x,ii)=> ii===idx?{...x,quantity:x.quantity+1}:x))}>+</button>
                        <button className="btn" onClick={() => setCart(cart.map((x,ii)=> ii===idx?{...x,quantity:Math.max(1,x.quantity-1)}:x))}>-</button>
                        <button className="btn btn-ghost" onClick={() => setCart(cart.filter((_,ii)=> ii!==idx))}>Quitar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 8, fontWeight: 600 }}>Subtotal: {fmt.format(totals.subtotal)}</div>
            <div>IVA: {fmt.format(totals.tax)}</div>
            <div style={{ fontWeight: 700 }}>Total: {fmt.format(totals.total)}</div>
          </div>
          <div className="card">
            <h4>Pagos</h4>
            <table className="table">
              <thead><tr><th>Método</th><th className="right">Monto</th><th></th></tr></thead>
              <tbody>
                {payments.map((p, idx) => (
                  <tr key={idx}>
                    <td>
                      <select value={p.method} onChange={e => setPayments(payments.map((x,i)=> i===idx?{...x,method:e.target.value}:x))}>
                        <option value="cash">Efectivo</option>
                        <option value="card">Tarjeta</option>
                        <option value="transfer">Transferencia</option>
                        <option value="credit">Crédito</option>
                      </select>
                    </td>
                    <td className="right">
                      <input type="number" step="0.01" value={p.amount} onChange={e => setPayments(payments.map((x,i)=> i===idx?{...x,amount:+e.target.value}:x))} />
                    </td>
                    <td><button className="btn btn-ghost" onClick={() => setPayments(payments.filter((_,i)=>i!==idx))}>Quitar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn" onClick={() => setPayments([...payments, { method: 'cash', amount: 0 }])}>Agregar pago</button>
            <div style={{ marginTop: 8 }}>Pagado: {fmt.format(payTotal)}</div>
            <div>Pendiente: {fmt.format(Math.max(0, totals.total - payTotal))}</div>
          </div>
          <div className="card" style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <input placeholder="ID cliente (requerido para crédito)" value={customerId} onChange={e => setCustomerId(e.target.value)} />
            <button className="btn btn-primary" onClick={checkout} disabled={!cart.length || (payTotal < totals.total && !hasCredit) || (hasCredit && !customerId)}>Cobrar</button>
            {(hasCredit && !customerId) && <span className="accent">Crédito requiere ID cliente</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

function Config() {
  const [settings, setSettings] = useState({})

  const applyTheme = (s) => {
    const root = document.documentElement
    if (s.theme_primary) root.style.setProperty('--primary', s.theme_primary)
    if (s.theme_accent) root.style.setProperty('--accent', s.theme_accent)
  }

  useEffect(() => {
    api('/settings').then(s => { setSettings(s); applyTheme(s) })
  }, [])

  const save = async () => {
    const s = await api('/settings', { method: 'PUT', body: JSON.stringify(settings) })
    setSettings(s)
    applyTheme(s)
  }

  return (
    <div className="container view">
      <h2>Configuración</h2>
      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <input placeholder="Moneda" value={settings.currency || ''} onChange={e => setSettings({ ...settings, currency: e.target.value })} />
        <input placeholder="IVA (0.16)" type="number" step="0.01" value={settings.tax_rate || 0} onChange={e => setSettings({ ...settings, tax_rate: e.target.value })} />
        <select value={settings.theme_preset || ''} onChange={e => {
          const presets = {
            oceano: { theme_primary: '#0ea5e9', theme_accent: '#22d3ee' },
            esmeralda: { theme_primary: '#10b981', theme_accent: '#34d399' },
            ambar: { theme_primary: '#f59e0b', theme_accent: '#f97316' },
            cereza: { theme_primary: '#e11d48', theme_accent: '#f43f5e' },
          }
          const val = e.target.value
          const next = { ...settings, theme_preset: val, ...(presets[val] || {}) }
          setSettings(next)
          applyTheme(next)
        }}>
          <option value="">Tema predeterminado</option>
          <option value="oceano">Océano</option>
          <option value="esmeralda">Esmeralda</option>
          <option value="ambar">Ámbar</option>
          <option value="cereza">Cereza</option>
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input title="Color primario" type="color" value={settings.theme_primary || '#1e88e5'} onChange={e => { const s = { ...settings, theme_primary: e.target.value }; setSettings(s); applyTheme(s) }} />
          <span>Primario</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input title="Color acento" type="color" value={settings.theme_accent || '#e53935'} onChange={e => { const s = { ...settings, theme_accent: e.target.value }; setSettings(s); applyTheme(s) }} />
          <span>Acento</span>
        </div>
        <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={save}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('ventas')
  const [dark, setDark] = useState(false)
  const [contrast, setContrast] = useState(false)
  const [toast, setToast] = useState('')
  
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const savedTheme = localStorage.getItem('theme')
    const savedContrast = localStorage.getItem('contrast')
    if (savedTheme === 'dark') setDark(true)
    else if (savedTheme === 'light') setDark(false)
    else setDark(mq.matches)
    setContrast(savedContrast === '1')
    const apply = () => { if (!savedTheme) setDark(mq.matches) }
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (contrast) root.setAttribute('data-theme', 'contrast')
    else if (dark) root.setAttribute('data-theme', 'dark')
    else root.removeAttribute('data-theme')
    localStorage.setItem('contrast', contrast ? '1' : '0')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark, contrast])

  useEffect(() => {
    const onErr = (e) => {
      setToast(typeof e.detail === 'string' ? e.detail : 'Error')
      const t = setTimeout(() => setToast(''), 4500)
      return () => clearTimeout(t)
    }
    window.addEventListener('app-error', onErr)
    return () => window.removeEventListener('app-error', onErr)
  }, [])
  
  const onToggleTheme = () => setDark(v => !v)
  const onToggleContrast = () => setContrast(v => !v)
  
  return (
    <div>
      <Toolbar tab={tab} setTab={setTab} onToggleTheme={onToggleTheme} dark={dark} />
      <div style={{ position: 'fixed', top: 10, right: 90 }}>
        <button className="btn" onClick={onToggleContrast}>{contrast ? 'Normal' : 'Contraste'}</button>
      </div>
      {toast && <div className="toast" onClick={() => setToast('')}>{toast}</div>}
      {tab === 'ventas' && <Ventas />}
      {tab === 'productos' && <Productos />}
      {tab === 'clientes' && <Clientes />}
      {tab === 'config' && <Config />}
    </div>
  )
}