import React, { useEffect, useState } from 'react';
import { Sun, Moon, Bell, Search, Menu } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../common/Button';
import { api } from '../../lib/api';

export const Topbar = () => {
    const { theme, toggleTheme, toggleSidebar } = useAppStore();
    const [cashStatus, setCashStatus] = useState(null);

    useEffect(() => {
        // Poll or event listener for cash status
        const checkCash = async () => {
            try {
                const res = await api('/cash/status');
                setCashStatus(res.session);
            } catch (e) { }
        };
        checkCash();
        const interval = setInterval(checkCash, 60000); // Check every minute

        const onCashUpdate = () => checkCash();
        window.addEventListener('cash-status', onCashUpdate);

        return () => {
            clearInterval(interval);
            window.removeEventListener('cash-status', onCashUpdate);
        };
    }, []);

    return (
        <header className="h-16 border-b border-[var(--border)] bg-[var(--card)] flex items-center justify-between px-6 fixed top-0 right-0 left-64 z-40 transition-all">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar}>
                    <Menu className="h-5 w-5" />
                </Button>
                <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="h-9 w-64 rounded-full border border-[var(--border)] bg-[var(--bg)] pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3">
                {cashStatus ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        Caja Abierta
                    </span>
                ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                        Caja Cerrada
                    </span>
                )}

                <div className="w-px h-6 bg-[var(--border)] mx-1" />

                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                    {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </Button>

                <Button variant="ghost" size="icon">
                    <Bell className="h-5 w-5" />
                </Button>
            </div>
        </header>
    );
};
