import { create } from 'zustand';

interface User {
  id: number;
  username: string;
  role: string;
  storeId?: number;
  storeName?: string;
}

interface Reseller {
  id: number;
  name: string;
  primary_color: string;
  domain: string;
}

interface UserStoreState {
  theme: string;
  user: User | null;
  token: string | null;
  reseller: Reseller | null;
  isSidebarOpen: boolean;
}

interface UserStoreActions {
  login: (user: User, token: string) => void;
  logout: () => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setReseller: (reseller: Reseller) => void;
  hasPermission: (required: string) => boolean;
}

const getStoredTheme = (): string => {
  try {
    return localStorage.getItem('theme') || 'light';
  } catch {
    return 'light';
  }
};

const getStoredUser = (): User | null => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};

export const useUserStore = create<UserStoreState & UserStoreActions>((set, get) => ({
  theme: getStoredTheme(),
  user: getStoredUser(),
  token: getStoredToken(),
  reseller: null,
  isSidebarOpen: true,

  login: (user, token) => {
    try {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
    } catch {
      // storage full or blocked
    }
    set({ user, token });
  },

  logout: () => {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } catch {
      // ignore
    }
    set({ user: null, token: null });
  },

  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    try {
      localStorage.setItem('theme', newTheme);
    } catch {
      // ignore
    }
    document.documentElement.setAttribute('data-theme', newTheme);
    set({ theme: newTheme });
  },

  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
  },

  setReseller: (reseller) => {
    set({ reseller });
  },

  hasPermission: (required) => {
    if (!required) return true;

    const role = get().user?.role || 'cajero';
    const rolePermissions: Record<string, string[]> = {
      admin: ['*'],
      supervisor: ['sales:*', 'products:*', 'customers:*', 'reports:*', 'cash:*'],
      cajero: ['sales:create', 'products:view', 'customers:view', 'customers:create'],
    };

    const permissions = rolePermissions[role] || [];
    if (permissions.includes('*')) return true;

    return permissions.some((p) => {
      if (p === required) return true;
      if (p === '*') return true;
      if (p.endsWith(':*')) return required.startsWith(p.slice(0, -2));
      if (p.endsWith('.*')) return required.startsWith(p.slice(0, -2));
      return false;
    });
  },
}));
