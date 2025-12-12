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
        <header className="h-[var(--header-height)] border-b border-[hsl(var(--border))] bg-[hsl(var(--card))/0.8] backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40 transition-all shadow-sm">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar}>
                    <Menu className="h-5 w-5" />
                </Button>
                <div className="relative hidden md:block group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))] group-focus-within:text-[hsl(var(--primary))] transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar (Ctrl+K)..."
                        className="h-10 w-64 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent transition-all"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3">
                {cashStatus ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Caja Abierta
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        Caja Cerrada
                    </span>
                )}

                <div className="w-px h-6 bg-[hsl(var(--border))] mx-2" />

                <Button variant="ghost" size="icon" onClick={toggleTheme} className="hover:bg-[hsl(var(--secondary))] rounded-full">
                    {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </Button>

                <Button variant="ghost" size="icon" className="hover:bg-[hsl(var(--secondary))] rounded-full">
                    <Bell className="h-5 w-5" />
                </Button>
            </div>
        </header>
    );
};
