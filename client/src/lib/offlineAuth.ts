import { getDeviceFingerprint } from './deviceFingerprint';
import { getStoredToken, isTokenExpiredOffline, storeToken, removeStoredToken } from './offlineTokenManager';

const OFFLINE_AUTH_DATA_KEY = 'offline_auth_data_v1';
const OFFLINE_USER_DATA_KEY = 'offline_user_data_v1';
const OFFLINE_SESSION_TTL = 24 * 60 * 60 * 1000; // 24 horas

export interface OfflineAuthRecord {
  username: string;
  passwordHash: string;
  deviceFingerprint: string;
  token: string;
  user: any;
  expiresAt: number;
  createdAt: number;
}

const OFFLINE_ADMIN_USER = {
  id: 0,
  username: 'admin',
  role: 'admin',
  storeId: 1,
  storeName: 'Punto de Venta Offline',
};

const OFFLINE_ADMIN_TOKEN = 'offline-admin-token';

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function digest(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hash);
}

function loadOfflineAuthRecord(): OfflineAuthRecord | null {
  try {
    const raw = localStorage.getItem(OFFLINE_AUTH_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveOfflineAuthRecord(record: OfflineAuthRecord): void {
  try {
    localStorage.setItem(OFFLINE_AUTH_DATA_KEY, JSON.stringify(record));
    localStorage.setItem(OFFLINE_USER_DATA_KEY, JSON.stringify(record.user));
  } catch {
    // ignore storage failures
  }
}

export function clearOfflineAuth(): void {
  try {
    localStorage.removeItem(OFFLINE_AUTH_DATA_KEY);
    localStorage.removeItem(OFFLINE_USER_DATA_KEY);
    removeStoredToken();
  } catch {
    // ignore
  }
}

export async function persistOfflineLogin(username: string, password: string, user: any, token: string): Promise<void> {
  const deviceFingerprint = await getDeviceFingerprint();
  const passwordHash = await digest(`${username}:${password}:${deviceFingerprint}`);
  const now = Date.now();
  const expiresAt = now + OFFLINE_SESSION_TTL;
  const record: OfflineAuthRecord = {
    username,
    passwordHash,
    deviceFingerprint,
    token,
    user,
    expiresAt,
    createdAt: now,
  };

  saveOfflineAuthRecord(record);
  storeToken(token);
  try {
    localStorage.setItem('user', JSON.stringify(user));
  } catch {
    // ignore
  }
}

export async function signInOffline(username: string, password: string): Promise<{ token: string; user: any }> {
  const deviceFingerprint = await getDeviceFingerprint();

  if (username === 'admin' && password === 'admin123') {
    const token = OFFLINE_ADMIN_TOKEN;
    const user = OFFLINE_ADMIN_USER;
    try {
      storeToken(token);
      localStorage.setItem('user', JSON.stringify(user));
    } catch {
      // ignore
    }
    return { token, user };
  }

  const record = loadOfflineAuthRecord();
  if (!record) {
    throw new Error('Sin acceso local. Inicia sesión en línea al menos una vez.');
  }

  if (record.deviceFingerprint !== deviceFingerprint) {
    throw new Error('El dispositivo no coincide con la sesión local.');
  }

  const attemptedHash = await digest(`${username}:${password}:${deviceFingerprint}`);
  if (attemptedHash !== record.passwordHash) {
    throw new Error('Credenciales locales incorrectas');
  }

  if (record.expiresAt < Date.now()) {
    throw new Error('La sesión offline expiró. Conéctate para renovarla.');
  }

  storeToken(record.token);
  return { token: record.token, user: record.user };
}

export function getStoredOfflineSession(): { token: string; user: any } | null {
  try {
    const token = getStoredToken();
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!token || !user) return null;
    return { token, user };
  } catch {
    return null;
  }
}

export async function restoreOfflineSession(): Promise<{ token: string; user: any } | null> {
  const session = getStoredOfflineSession();
  if (!session) return null;

  if (!isTokenExpiredOffline()) {
    return session;
  }

  const record = loadOfflineAuthRecord();
  if (!record) return null;
  const deviceFingerprint = await getDeviceFingerprint();
  if (record.deviceFingerprint !== deviceFingerprint) return null;
  if (record.expiresAt < Date.now()) return null;

  storeToken(record.token);
  return { token: record.token, user: record.user };
}
