const API = 'http://localhost:3001/api'

export async function api(path, options) {
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

export async function getProducts() { return api('/products') }
export async function getCustomers() { return api('/customers') }
export async function getProductBySku(sku) {
  const list = await getProducts()
  return list.find(x => String(x.sku||'').toLowerCase() === String(sku||'').toLowerCase()) || null
}
export async function createSale(payload) { return api('/sales', { method:'POST', body: JSON.stringify(payload) }) }
export async function openCash(opening_balance=0) { return api('/cash/open', { method:'POST', body: JSON.stringify({ opening_balance }) }) }
export async function closeCash() { return api('/cash/close', { method:'POST' }) }
export async function getCashSession() { return api('/cash/status') }
export async function getCashMovements() { return api('/cash/movements') }
export async function getReport(kind, params={}) {
  const p = new URLSearchParams(params)
  const qs = p.toString()
  const base = qs ? `?${qs}` : ''
  return api(`/reports/${kind}${base}`)
}

export async function getAudits(params={}) {
  const p = new URLSearchParams(params)
  const qs = p.toString()
  const base = qs ? `?${qs}` : ''
  return api(`/audits${base}`)
}

export async function getAuditEvents() { return api('/audits/events') }

export async function getMetrics() {
  let res
  const token = localStorage.getItem('token') || ''
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  res = await fetch(`${API}/metrics`, { headers })
  if (!res.ok) throw new Error('Error al obtener métricas')
  return res.text()
}
