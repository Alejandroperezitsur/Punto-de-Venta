import { cacheApiResponse, getApiCache, getApiCacheByTag, getApiCacheByPrefix } from './db';
import { persistOfflineLogin, signInOffline } from './offlineAuth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const DEFAULT_TIMEOUT_MS = 12000;
const delay = ms => new Promise(r => setTimeout(r, ms));
let deviceFpPromise = null;

async function getDeviceFingerprintHeader() {
  if (!deviceFpPromise) {
    try {
      deviceFpPromise = import('./deviceFingerprint').then((m) => m.getDeviceFingerprint());
    } catch {
      return '';
    }
  }
  try {
    return await deviceFpPromise;
  } catch {
    return '';
  }
}

function getRequestKey(path, method = 'GET') {
  return `${method.toUpperCase()}:${path}`;
}

function normalizeError(error) {
  if (!error) return 'La conexión se perdió o el servidor no respondió.';
  if (typeof error === 'string') {
    if (/failed to fetch/i.test(error)) return 'La conexión se perdió o el servidor no respondió.';
    return error;
  }
  if (error instanceof Error) {
    if (error.name === 'AbortError') return 'La solicitud fue cancelada por tiempo de espera.';
    if (/failed to fetch/i.test(error.message)) return 'La conexión se perdió o el servidor no respondió.';
    return error.message;
  }
  return 'La conexión se perdió o el servidor no respondió.';
}

function parseJsonBody(options) {
  try {
    if (!options || !options.body) return null;
    return typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
  } catch {
    return null;
  }
}

function createAbortController(timeoutMs, signal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const originalSignal = controller.signal;
  const clean = () => clearTimeout(timeout);
  return { signal: originalSignal, clean };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const { signal, clean } = createAbortController(timeoutMs, options.signal);
  try {
    return await fetch(url, { ...options, signal });
  } finally {
    clean();
  }
}

async function getCachedOfflineResponse(path, method) {
  const requestKey = getRequestKey(path, method);
  const cached = await getApiCache(requestKey);
  if (cached) return cached.response;

  if (method === 'GET') {
    if (path.startsWith('/products/scan/')) {
      const products = await getApiCacheByTag('products');
      const last = products.length ? products[products.length - 1].response : null;
      return last?.find?.((item) => item?.sku === path.split('/').pop()) ?? null;
    }

    if (path.startsWith('/products')) {
      const products = await getApiCacheByTag('products');
      return products.length ? products[products.length - 1].response : [];
    }

    if (path.startsWith('/customers')) {
      const customers = await getApiCacheByTag('customers');
      return customers.length ? customers[customers.length - 1].response : [];
    }

    if (path.startsWith('/cash')) {
      const cash = await getApiCacheByTag('cash');
      return cash.length ? cash[cash.length - 1].response : null;
    }
  }

  return null;
}

async function cacheSuccessfulResponse(path, method, json) {
  if (method !== 'GET') return;
  const requestKey = getRequestKey(path, method);
  const tags = [];
  if (path.startsWith('/products')) tags.push('products');
  if (path.startsWith('/customers')) tags.push('customers');
  if (path.startsWith('/cash')) tags.push('cash');
  if (path.startsWith('/reports')) tags.push('reports');
  if (path.startsWith('/audits')) tags.push('audits');
  if (path.startsWith('/auth')) tags.push('auth');
  try {
    await cacheApiResponse(requestKey, method, json, tags);
  } catch {
    // ignore caching failures
  }
}

async function tryOfflineLoginFallback(options) {
  const data = parseJsonBody(options);
  if (!data || !data.username || !data.password) {
    throw new Error('No hay credenciales válidas para autenticación offline.');
  }
  return signInOffline(data.username, data.password);
}

export async function api(path, options = {}) {
  const isStaticEnv = typeof window !== 'undefined' && (
    window.location.hostname.includes('github.io') || 
    window.location.hostname.includes('github.com')
  );

  if (isStaticEnv) {
    try {
      const { handleOfflineRequest } = await import('./offlineDB');
      return await handleOfflineRequest(path, options);
    } catch (offlineErr) {
      console.error('[Offline Interceptor Error]', offlineErr);
      throw offlineErr;
    }
  }

  let res;
  const { retries = 0, backoff = 500, timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  const token = localStorage.getItem('token') || '';
  const baseHeaders = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  const headers = token ? { ...baseHeaders, Authorization: `Bearer ${token}` } : baseHeaders;

  const fp = await getDeviceFingerprintHeader();
  if (fp) headers['X-Device-Fingerprint'] = fp;

  try {
    res = await fetchWithTimeout(`${API_BASE}${path}`, { headers, ...fetchOptions }, timeoutMs);
    if (!res.ok && res.status >= 500 && retries > 0) {
      throw new Error(`Server Error ${res.status}`);
    }
  } catch (e) {
    const message = normalizeError(e);
    
    // Ante cualquier error de red, intentar resolver con el motor offline completo
    try {
      const { handleOfflineRequest } = await import('./offlineDB');
      const offlineResult = await handleOfflineRequest(path, options);
      return offlineResult;
    } catch (offlineErr) {
      console.warn('[Offline Fallback Error]', offlineErr.message);
    }

    if (path === '/auth/login') {
      try {
        const fallback = await tryOfflineLoginFallback(fetchOptions);
        return fallback;
      } catch (offlineError) {
        const offlineMessage = normalizeError(offlineError);
        try { window.dispatchEvent(new CustomEvent('app-error', { detail: offlineMessage })); } catch { }
        throw new Error(offlineMessage);
      }
    }

    if (retries > 0) {
      await delay(backoff);
      return api(path, { ...options, retries: retries - 1, backoff: backoff * 2 });
    }

    const cached = await getCachedOfflineResponse(path, fetchOptions.method || 'GET');
    if (cached !== null) {
      return cached;
    }

    try { window.dispatchEvent(new CustomEvent('app-error', { detail: message })); } catch { }
    throw new Error(message);
  }

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
        if (typeof data === 'string') {
          msg = data;
        } else if (data.error && typeof data.error === 'string') {
          msg = data.error;
        } else if (data.message && typeof data.message === 'string') {
          msg = data.message;
        } else if (data.error && typeof data.error === 'object' && typeof data.error.message === 'string') {
          msg = data.error.message;
        } else if (data.message && typeof data.message === 'object' && typeof data.message.error === 'string') {
          msg = data.message.error;
        } else {
          msg = JSON.stringify(data);
        }
      } catch {
        msg = await res.text();
      }
    } else {
      msg = await res.text();
    }

    if (res.status === 401) {
      try { window.dispatchEvent(new CustomEvent('auth-error')); } catch { }
    } else {
      try { window.dispatchEvent(new CustomEvent('app-error', { detail: msg })); } catch { }
    }
    throw new Error(msg);
  }

  const json = await res.json();
  const result = json.data !== undefined ? json.data : json;

  if (path === '/auth/login' && result?.token && result?.user) {
    const credentials = parseJsonBody(fetchOptions);
    if (credentials?.username && credentials?.password) {
      await persistOfflineLogin(credentials.username, credentials.password, result.user, result.token);
    }
  }

  await cacheSuccessfulResponse(path, fetchOptions.method || 'GET', result);
  return result;
}

export const get = (path) => api(path, { retries: 2, timeoutMs: DEFAULT_TIMEOUT_MS });

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
    headers: payload.headers || {},
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
