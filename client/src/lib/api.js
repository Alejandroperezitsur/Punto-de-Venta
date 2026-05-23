const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const delay = ms => new Promise(r => setTimeout(r, ms));

let deviceFpPromise = null;

function getDeviceFingerprintHeader() {
  if (!deviceFpPromise) {
    try {
      deviceFpPromise = import('./deviceFingerprint').then(m => m.getDeviceFingerprint());
    } catch {
      return '';
    }
  }
  return '';
}

export async function api(path, options = {}) {
  let res;
  const { retries = 0, backoff = 500, ...fetchOptions } = options;

  const token = localStorage.getItem('token') || '';
  const baseHeaders = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  const headers = token ? { ...baseHeaders, Authorization: `Bearer ${token}` } : baseHeaders;

  // Add device fingerprint
  const fp = getDeviceFingerprintHeader();
  if (fp) headers['X-Device-Fingerprint'] = fp;

  try {
    res = await fetch(`${API_BASE}${path}`, { headers, ...fetchOptions });

    if (!res.ok && res.status >= 500 && retries > 0) {
      throw new Error(`Server Error ${res.status}`);
    }
  } catch (e) {
    if (retries > 0) {
      await delay(backoff);
      return api(path, { ...options, retries: retries - 1, backoff: backoff * 2 });
    }

    const msg = e.message === 'Failed to fetch' ? 'Sin conexión al servidor' : e.message;
    try { window.dispatchEvent(new CustomEvent('app-error', { detail: msg })); } catch { }
    throw e;
  }

  // Handle token rotation
  const newToken = res.headers.get('X-New-Token');
  if (newToken) {
    localStorage.setItem('token', newToken);
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

    if (res.status === 401) {
      try { window.dispatchEvent(new CustomEvent('auth-error')); } catch { }
    } else if (res.status === 409) {
      throw new Error(msg);
    } else {
      try { window.dispatchEvent(new CustomEvent('app-error', { detail: msg })); } catch { }
    }
    throw new Error(msg);
  }

  const json = await res.json();
  return (json.data !== undefined) ? json.data : json;
}

export const get = (path) => api(path, { retries: 2 });

export async function getProducts(cursor, take = 50) {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  if (take) params.set('take', take);
  const qs = params.toString();
  return get(`/products${qs ? '?' + qs : ''}`);
}

export async function getCustomers() { return get('/customers'); }

export async function getProductBySku(sku) {
  try {
    return await api(`/products/scan/${encodeURIComponent(sku)}`);
  } catch {
    return null;
  }
}

export async function createSale(payload) {
  return api('/sales', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: payload.headers || {}
  });
}

export async function openCash(opening_balance = 0) {
  return api('/cash/open', { method: 'POST', body: JSON.stringify({ opening_balance }) });
}

export async function closeCash(counted_cash) {
  return api('/cash/close', { method: 'POST', body: JSON.stringify({ counted_cash }) });
}

export async function getCashSession() { return get('/cash/status'); }
export async function getCashMovements() { return get('/cash/movements'); }
export async function getCashHistory() { return get('/cash/history'); }

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
  const res = await fetch(`${API_BASE}/metrics`, { headers });
  if (!res.ok) throw new Error('Error al obtener métricas');
  return res.text();
}
