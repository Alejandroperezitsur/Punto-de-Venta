const TOKEN_KEY = 'auth_token';
const ISSUED_AT_KEY = 'token_issued_at';
const TOKEN_DURATION_MS = 12 * 60 * 60 * 1000;

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ISSUED_AT_KEY, String(Date.now()));
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ISSUED_AT_KEY);
}

export function isTokenExpiredOffline(): boolean {
  const issuedAt = localStorage.getItem(ISSUED_AT_KEY);
  if (!issuedAt) return true;
  return Date.now() - Number(issuedAt) > TOKEN_DURATION_MS;
}

export function getTokenExpiryMs(): number {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return 0;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (payload.exp || 0) * 1000;
  } catch {
    return 0;
  }
}
