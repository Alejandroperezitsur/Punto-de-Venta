import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import jsPDF from 'jspdf'
import { api } from '../lib/api'
import ProductSearch from '../components/ProductSearch'
import CartTable from '../components/CartTable'
import PaymentSection from '../components/PaymentSection'
import TotalsSummary from '../components/TotalsSummary'
import SkuInput from '../components/SkuInput'
import CustomerSection from '../components/CustomerSection'

export default function Ventas() {
  const [products, setProducts] = useState([])
  const [productFilter, setProductFilter] = useState('')
  const [skuInput, setSkuInput] = useState('')
  const [cart, setCart] = useState([])
  
  const productSearchRef = useRef(null)
  const skuRef = useRef(null)
  const discountRef = useRef(null)
  const [discount] = useState(0)
  const [customerId, setCustomerId] = useState('')
  
  const customerRef = useRef(null)
  
  const [newProdAutoAdd] = useState(() => { try { return localStorage.getItem('autoAddProduct') !== '0' } catch { return true } })
  const [newClientSelectCurrent] = useState(() => { try { return localStorage.getItem('selectNewClient') !== '0' } catch { return true } })
  const [customers, setCustomers] = useState([])
  
  const [receivablesSummary, setReceivablesSummary] = useState(null)
  
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
  

  useEffect(() => { api('/settings').then(s => { setCurrency(s.currency || 'MXN'); setTaxRate(+s.tax_rate || 0.16); setBusinessName(s.business_name || ''); setBusinessRFC(s.business_rfc || ''); setBusinessPhone(s.business_phone || ''); setBusinessEmail(s.business_email || ''); setBusinessAddress(s.business_address || ''); setLogoDataUrl(s.logo_data_url || ''); setTicketWidth(parseInt(s.ticket_width || '80')); setLogoSize(parseInt(s.ticket_logo_size_mm || '20')); setAutoScan(String(s.auto_scan || '') === '1'); setTicketFooter(s.ticket_footer || ''); setTicketQrDataUrl(s.ticket_qr_data_url || ''); setTicketQrCaption(s.ticket_qr_caption || ''); setTicketQr2DataUrl(s.ticket_qr2_data_url || ''); setTicketQr2Caption(s.ticket_qr2_caption || ''); setTicketQrSize(parseInt(s.ticket_qr_size_mm || String((parseInt(s.ticket_width || '80') <= 58) ? 26 : 32))); setCreditTicketShowContact2(String(s.credit_ticket_show_contact || '1') === '1'); setCreditTicketShowRFC2(String(s.credit_ticket_show_rfc || '1') === '1'); setTicketBodySize2(parseInt(s.ticket_font_body_size || '10')); setTicketLineGap2(parseInt(s.ticket_line_gap_mm || '5')); setTicketHeaderSize2(parseInt(s.ticket_font_header_size || '12')); setTicketCompact2(String(s.ticket_compact_mode || '0') === '1') }) }, [])
  const fmt = useMemo(() => new Intl.NumberFormat(undefined, { style: 'currency', currency }), [currency])

  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, i) => acc + i.unit_price * i.quantity, 0)
    const tax = +(subtotal * taxRate).toFixed(2)
    const disc = +parseFloat(discount || 0)
    const discApplied = Math.max(0, Math.min(disc, subtotal + tax))
    const total = +((subtotal + tax) - discApplied).toFixed(2)
    return { subtotal, tax, discount: discApplied, total }
  }, [cart, discount, taxRate])

  const payTotal = useMemo(() => payments.reduce((acc, p) => acc + (p.amount || 0), 0), [payments])
  const hasCredit = useMemo(() => payments.some(p => p.method === 'credit' && p.amount > 0), [payments])
  const customerExists = useMemo(() => customers.some(c => String(c.id) === String(customerId)), [customers, customerId])
  const customerValid = useMemo(() => !hasCredit || (/^\d+$/.test((customerId || '')) && customerExists), [hasCredit, customerId, customerExists])
  const creditAllowed = useMemo(() => !(receivablesSummary && (receivablesSummary.total_due || 0) > 0), [receivablesSummary])

  const loadProducts = async () => { try { const list = await api('/products'); setProducts(list) } catch { setProducts([]) } }
  useEffect(() => { loadProducts() }, [])
  const loadCustomers = async () => setCustomers(await api('/customers'))
  useEffect(() => { loadCustomers() }, [])
  useEffect(() => { (async () => { try {
    if (!customerId) { setReceivablesSummary(null); return }
    const s = await api(`/receivables/summary/${customerId}`)
    setReceivablesSummary(s)
  } catch { setReceivablesSummary(null) } })() }, [customerId])
  

  const addToCart = useCallback((p, qty = 1) => {
    const q = Math.max(1, parseInt(qty || 1))
    const existing = cart.find(i => i.product_id === p.id)
    if (existing) setCart(cart.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + q } : i))
    else setCart([...cart, { product_id: p.id, name: p.name, unit_price: p.price, quantity: q }])
  }, [cart])
  const addBySku = useCallback((sku) => {
    const p = products.find(x => String(x.sku || '').toLowerCase() === String(sku || '').toLowerCase())
    if (p) addToCart(p)
  }, [products, addToCart])
  useEffect(() => { if (!autoScan) return; if (!skuInput) return; if (scanTimerRef.current) clearTimeout(scanTimerRef.current); scanTimerRef.current = setTimeout(() => { addBySku(skuInput); setSkuInput('') }, 300); return () => { if (scanTimerRef.current) { clearTimeout(scanTimerRef.current); scanTimerRef.current = null } } }, [skuInput, autoScan, addBySku])
  useEffect(() => { try { productSearchRef.current?.focus() } catch {} }, [])
  useEffect(() => { try { const q = localStorage.getItem('productFilter') || ''; if (q) setProductFilter(q) } catch {} }, [])
  useEffect(() => { try { localStorage.setItem('productFilter', productFilter || '') } catch {} }, [productFilter])
  
  useEffect(() => { try { localStorage.setItem('autoAddProduct', newProdAutoAdd ? '1' : '0') } catch {} }, [newProdAutoAdd])
  useEffect(() => { try { localStorage.setItem('selectNewClient', newClientSelectCurrent ? '1' : '0') } catch {} }, [newClientSelectCurrent])

  const paymentsRef = useRef(payments)
  const totalsRef = useRef({ total: 0 })
  const creditAllowedRef = useRef(false)
  const checkoutRef = useRef(null)
  useEffect(() => { paymentsRef.current = payments }, [payments])
  useEffect(() => { totalsRef.current = { total: totals.total } }, [totals.total])
  useEffect(() => { creditAllowedRef.current = creditAllowed }, [creditAllowed])
  const checkout = useCallback(async () => {
    if (!cart.length) return
    if (!customerValid) { try { window.dispatchEvent(new CustomEvent('app-error', { detail: 'Crédito requiere ID cliente válido' })) } catch {}; try { customerRef.current?.focus() } catch {}; return }
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
      if (logoDataUrl) { try { const m = String(logoDataUrl).match(/^data:image\/(png|jpeg|jpg);/i); const fmt2 = (m?.[1] || 'PNG').toUpperCase().replace('JPG','JPEG'); const w = logoSize || 20; const x = (pageW - w) / 2; doc.addImage(logoDataUrl, fmt2, x, y, w, w); y += (w + 2) } catch {} }
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
      doc.save(`ticket_${sale.id}.pdf`)
    }
    setCart([])
    setPayments([{ method: 'cash', amount: 0 }])
    await loadProducts()
  }, [cart, customerValid, customerId, totals, payTotal, payments, hasCredit, fmt, ticketWidth, logoDataUrl, logoSize, ticketHeaderSize2, ticketBodySize2, ticketCompact2, ticketLineGap2, businessAddress, businessPhone, businessEmail, businessRFC, businessName, creditTicketShowContact2, creditTicketShowRFC2, ticketFooter, ticketQr2Caption, ticketQr2DataUrl, ticketQrCaption, ticketQrDataUrl, ticketQrSize])
  useEffect(() => { checkoutRef.current = checkout }, [checkout])
  useEffect(() => {
    const onKey = (e) => {
      try {
        if (e.key === 'F1') { e.preventDefault(); productSearchRef.current?.focus(); return }
        if (e.key === 'F2') { e.preventDefault(); skuRef.current?.focus(); return }
        if (e.key === 'F3') { e.preventDefault(); customerRef.current?.focus(); return }
        if (e.altKey && e.key === 'Enter') { e.preventDefault(); const rest = Math.max(0, totalsRef.current.total - (paymentsRef.current.reduce((s,p)=>s+(p.amount||0),0))); if (!(rest > 0)) return; const idx = paymentsRef.current.findIndex(p => p.method === 'cash'); if (idx >= 0) setPayments(paymentsRef.current.map((x,i)=> i===idx?{...x,amount:(x.amount||0)+rest}:x)); else setPayments([...paymentsRef.current, { method: 'cash', amount: rest }]); try { window.dispatchEvent(new CustomEvent('app-message', { detail: 'Pendiente completado en efectivo' })) } catch {}; return }
        if (e.altKey && String(e.key).toLowerCase() === 'c') { e.preventDefault(); const rest = Math.max(0, totalsRef.current.total - (paymentsRef.current.reduce((s,p)=>s+(p.amount||0),0))); if (!(rest > 0)) return; if (!creditAllowedRef.current) return; const idx = paymentsRef.current.findIndex(p => p.method === 'credit'); if (idx >= 0) setPayments(paymentsRef.current.map((x,i)=> i===idx?{...x,amount:rest}:x)); else setPayments([...paymentsRef.current, { method: 'credit', amount: rest }]); try { window.dispatchEvent(new CustomEvent('app-message', { detail: 'Pendiente enviado a crédito' })) } catch {}; return }
        if (e.altKey && String(e.key).toLowerCase() === 'd') { e.preventDefault(); discountRef.current?.focus(); return }
        
        if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); checkoutRef.current?.(); return }
      } catch {}
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  

  

  

  return (
    <div className="container view">
      <h2>Ventas</h2>
      <div className="grid" style={{gridTemplateColumns:'2fr 2fr 1fr', gap:12}}>
        <div>
          <ProductSearch value={productFilter} onChange={setProductFilter} />
          <SkuInput value={skuInput} onChange={setSkuInput} onSubmit={(v)=>{ if (v) addBySku(v); setSkuInput('') }} />
          <div className="muted" aria-live="polite">Productos: {products.length}</div>
        </div>
        <div>
          <CustomerSection customers={customers} customerId={customerId} onSelect={(v)=> setCustomerId(v)} />
        </div>
        <div>
          <TotalsSummary totals={totals} currencyFmt={fmt} />
        </div>
      </div>
      <CartTable items={cart}
        onInc={(id)=> setCart(cart.map(i=> i.product_id===id?{...i,quantity:i.quantity+1}:i))}
        onDec={(id)=> setCart(cart.map(i=> i.product_id===id?{...i,quantity:Math.max(1,i.quantity-1)}:i))}
        onRemove={(id)=> setCart(cart.filter(i=> i.product_id!==id))}
      />
      <PaymentSection payments={payments}
        onChange={(idx,val)=> setPayments(payments.map((p,i)=> i===idx?val:p))}
        onAddCash={()=>{ const rest = Math.max(0, totals.total - payTotal); if (!(rest>0)) return; const idx = payments.findIndex(p=>p.method==='cash'); if (idx>=0) setPayments(payments.map((x,i)=> i===idx?{...x,amount:(x.amount||0)+rest}:x)); else setPayments([...payments,{method:'cash',amount:rest}]) }}
        onAddCredit={()=>{ const rest = Math.max(0, totals.total - payTotal); if (!(rest>0)) return; if (!creditAllowed) return; const idx = payments.findIndex(p=>p.method==='credit'); if (idx>=0) setPayments(payments.map((x,i)=> i===idx?{...x,amount:rest}:x)); else setPayments([...payments,{method:'credit',amount:rest}]) }}
      />
      <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
        <button className="btn btn-primary" onClick={checkout} disabled={!cart.length}>Cobrar</button>
      </div>
    </div>
  )
}
