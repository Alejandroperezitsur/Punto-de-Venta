import { describe, it, expect, beforeEach } from 'vitest';
import { signInOffline, persistOfflineLogin, restoreOfflineSession, clearOfflineAuth } from '../../src/lib/offlineAuth';

describe('Offline auth fallback', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should allow the built-in offline admin credentials', async () => {
    const result = await signInOffline('admin', 'admin123');
    expect(result.token).toBe('offline-admin-token');
    expect(result.user.username).toBe('admin');
    expect(result.user.role).toBe('admin');
  });

  it('should persist a successful online login for future offline restore', async () => {
    await persistOfflineLogin('javier', 'strongpass', { id: 5, username: 'javier', role: 'cajero', storeId: 2 }, 'online-token');
    const result = await signInOffline('javier', 'strongpass');
    expect(result.token).toBe('online-token');
    expect(result.user.username).toBe('javier');
  });

  it('should restore a previous offline session when the token is still valid', async () => {
    await persistOfflineLogin('patricia', 'p4ssw0rd', { id: 7, username: 'patricia', role: 'admin', storeId: 1 }, 'restore-token');
    const restored = await restoreOfflineSession();
    expect(restored).not.toBeNull();
    expect(restored?.token).toBe('restore-token');
    expect(restored?.user.username).toBe('patricia');
  });

  it('should clear offline auth data', async () => {
    await persistOfflineLogin('carlos', 'password', { id: 8, username: 'carlos', role: 'cajero', storeId: 1 }, 'token-carlos');
    clearOfflineAuth();
    const restored = await restoreOfflineSession();
    expect(restored).toBeNull();
  });
});
