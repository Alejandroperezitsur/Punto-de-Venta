import { create } from 'zustand';

export const useAppStore = create((set) => ({
    theme: localStorage.getItem('theme') || 'light',
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token') || null,

    toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        return { theme: newTheme };
    }),

    isSidebarOpen: true,
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

    login: (user, token) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
        set({ user, token });
    },

    logout: () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        set({ user: null, token: null });
    },

    hasPermission: (required) => {
        const state = useAppStore.getState(); // Access current state
        if (!required) return true;

        const role = state.user?.role || 'cajero';
        const rolePermissions = {
            'admin': ['*'],
            'supervisor': ['sales.*', 'products.*', 'customers.*', 'reports.*', 'cash.*'],
            'cajero': ['sales.create', 'products.view', 'customers.view', 'customers.create']
        };

        const permissions = rolePermissions[role] || [];
        if (permissions.includes('*')) return true;

        // Exact match or wildcard match (e.g. 'sales.view' matches 'sales.*')
        return permissions.some(p => p === required || (p.endsWith('.*') && required.startsWith(p.slice(0, -2))));
    }
}));
