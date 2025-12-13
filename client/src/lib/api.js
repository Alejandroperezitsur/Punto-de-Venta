const API = 'http://localhost:3001/api';

// Simple delay helper
const delay = ms => new Promise(r => setTimeout(r, ms));

export async function api(path, options = {}) {
  let res;
  const { retries = 0, backoff = 500, ...fetchOptions } = options;

  const token = localStorage.getItem('token') || '';
  const baseHeaders = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  const headers = token ? { ...baseHeaders, Authorization: `Bearer ${token}` } : baseHeaders;

  try {
    res = await fetch(`${API}${path}`, { headers, ...fetchOptions });

    // Retry on 5xx or Network Error (if thrown)
    if (!res.ok && res.status >= 500 && retries > 0) {
      throw new Error(`Server Error ${res.status}`);
    }
  } catch (e) {
    if (retries > 0) {
      await delay(backoff);
      return api(path, { ...options, retries: retries - 1, backoff: backoff * 2 });
    }

    // Dispatch Global Error
    const msg = e.message === 'Failed to fetch' ? 'Sin conexión al servidor' : e.message;
    try { window.dispatchEvent(new CustomEvent('app-error', { detail: msg })); } catch { }
    throw e;
  }

  if (!res.ok) {
    let msg = 'Error';
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      try {
        const data = await res.json();
        msg = typeof data === 'string' ? data : (data.error || JSON.stringify(data));
      } catch {
        msg = await res.text();
      }
    } else {
      msg = await res.text();
    }

    // 401: Token expired?
    if (res.status === 401) {
      // Optional: Redirect to login or dispatch auth-error
      try { window.dispatchEvent(new CustomEvent('auth-error')); } catch { }
    } else {
      try { window.dispatchEvent(new CustomEvent('app-error', { detail: msg })); } catch { }
    }
    throw new Error(msg);
  }

  const json = await res.json();
  return (json.data !== undefined) ? json.data : json;
}

// GET with retry default
export const get = (path) => api(path, { retries: 2 });

// Export helpers using retry for reads
export async function getProducts() { return get('/products'); }
export async function getCustomers() { return get('/customers'); }
export async function getProductBySku(sku) {
  const list = await getProducts();
  return list.find(x => String(x.sku || '').toLowerCase() === String(sku || '').toLowerCase()) || null;
}
export async function createSale(payload) { return api('/sales', { method: 'POST', body: JSON.stringify(payload) }); }
export async function openCash(opening_balance = 0) { return api('/cash/open', { method: 'POST', body: JSON.stringify({ opening_balance }) }); }
export async function closeCash() { return api('/cash/close', { method: 'POST' }); }
export async function getCashSession() { return get('/cash/status'); }
export async function getCashMovements() { return get('/cash/movements'); }
export async function getReport(kind, params = {}) {
  const p = new URLSearchParams(params);
  const qs = p.toString();
  const base = qs ? `?${qs}` : '';
  return get(`/reports/${kind}${base}`);
}
export async function getAudits(params = {}) {
  const p = new URLSearchParams(params);
  const qs = p.toString();
  const base = qs ? `?${qs}` : '';
  return get(`/audits${base}`);
}
export async function getAuditEvents() { return get('/audits/events'); }
export async function getMetrics() {
  const token = localStorage.getItem('token') || '';
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API}/metrics`, { headers });
  if (!res.ok) throw new Error('Error al obtener métricas');
  return res.text();
}
