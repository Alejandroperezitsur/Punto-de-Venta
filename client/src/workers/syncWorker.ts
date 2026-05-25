/// <reference lib="webworker" />

const API_BASE = self.location.origin + '/api';

let authToken: string | null = null;
let authStoreId: number | null = null;
let authUserId: number | null = null;

function log(level: string, message: string): void {
  self.postMessage({ type: 'LOG', level, message });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function trySync(
  endpoint: string,
  payload: unknown,
  idempotencyKey: string,
  retries = 0,
): Promise<{ ok: boolean; error?: string; data?: unknown }> {
  const maxRetries = 5;
  const backoff = [500, 1000, 2000, 4000, 8000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          'X-Idempotency-Key': idempotencyKey,
          'X-Store-ID': String(authStoreId ?? 1),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok || res.status === 409) {
        const data = res.status !== 409 ? await res.json().catch(() => ({})) : {};
        return { ok: true, data };
      }

      if (res.status === 400) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.error || 'Validation error' };
      }

      if (res.status === 401) {
        return { ok: false, error: 'Unauthorized' };
      }

      if (res.status >= 500 && attempt < maxRetries) {
        await delay(backoff[attempt]);
        continue;
      }

      return { ok: false, error: `HTTP ${res.status}` };
    } catch (e) {
      if (attempt < maxRetries) {
        const jitter = Math.random() * backoff[attempt];
        await delay(jitter);
        continue;
      }
      return { ok: false, error: 'No connection' };
    }
  }

  return { ok: false, error: 'Max retries reached' };
}

async function tryBatchSync(
  endpoint: string,
  batchPayload: unknown,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        'X-Store-ID': String(authStoreId ?? 1),
      },
      body: JSON.stringify(batchPayload),
    });

    if (res.ok || res.status === 409) {
      return { ok: true };
    }

    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data.error || `HTTP ${res.status}` };
  } catch {
    return { ok: false, error: 'No connection' };
  }
}

self.addEventListener('message', async (event: MessageEvent) => {
  const msg = event.data;

  if (msg.type === 'AUTH_UPDATE') {
    authToken = msg.token ?? null;
    authStoreId = msg.storeId ?? null;
    authUserId = msg.userId ?? null;
    log('info', 'Auth updated');
    return;
  }

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

  if (msg.type === 'BATCH_SYNC_SALES') {
    const result = await tryBatchSync('/sales/batch', msg.payload);
    self.postMessage({
      type: 'BATCH_SYNC_RESULT',
      id: msg.id,
      ok: result.ok,
      error: result.error,
    });
  }

  if (msg.type === 'BATCH_SYNC_MOVEMENTS') {
    const result = await tryBatchSync('/inventory/batch-move', msg.payload);
    self.postMessage({
      type: 'BATCH_SYNC_RESULT',
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
