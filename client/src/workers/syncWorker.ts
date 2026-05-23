/// <reference lib="webworker" />

const API_BASE = self.location.origin + '/api';

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function trySync(
  endpoint: string,
  payload: unknown,
  idempotencyKey: string,
  retries = 0,
): Promise<{ ok: boolean; error?: string }> {
  const maxRetries = 5;
  const backoff = [500, 1000, 2000, 4000, 8000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok || res.status === 409) {
        return { ok: true };
      }

      if (res.status === 400) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.error || 'Error de validación' };
      }

      if (res.status >= 500 && attempt < maxRetries) {
        await delay(backoff[attempt]);
        continue;
      }

      return { ok: false, error: `HTTP ${res.status}` };
    } catch (e) {
      if (attempt < maxRetries) {
        await delay(backoff[attempt]);
        continue;
      }
      return { ok: false, error: 'Sin conexión' };
    }
  }

  return { ok: false, error: 'Máximos reintentos alcanzados' };
}

async function getToken(): Promise<string | null> {
  try {
    const keys = await self.caches.keys();
    // Token is not in cache, read from IndexedDB via the main thread
    // Instead, we use a message-based approach
    return null;
  } catch {
    return null;
  }
}

self.addEventListener('message', async (event: MessageEvent) => {
  const msg = event.data;

  if (msg.type === 'SYNC_SALE') {
    const result = await trySync('/sales', msg.payload, msg.idempotencyKey, msg.retries || 0);
    self.postMessage({
      type: 'SYNC_SALE_RESULT',
      id: msg.id,
      ok: result.ok,
      error: result.error,
    });
  }

  if (msg.type === 'SYNC_MOVEMENT') {
    const result = await trySync('/inventory/move', msg.payload, msg.idempotencyKey, msg.retries || 0);
    self.postMessage({
      type: 'SYNC_MOVEMENT_RESULT',
      id: msg.id,
      ok: result.ok,
      error: result.error,
    });
  }

  if (msg.type === 'SYNC_ALL') {
    self.postMessage({ type: 'SYNC_ALL_READY' });
  }
});

self.postMessage({ type: 'WORKER_READY' });
