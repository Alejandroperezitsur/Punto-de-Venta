import React, { useEffect, useState } from 'react';
import { Sun, Moon, Bell, Menu, Command } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useUserStore } from '../../store/userStore';
import { Button } from '../ui/Button';
import { ConnectionStatus } from '../common/ConnectionStatus';
import { cn } from '../../utils/cn';

export const Topbar = () => {
  const { isDark, toggleDark } = useTheme();
  const { toggleSidebar } = useUserStore();
  const [cashStatus, setCashStatus] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const checkCash = async () => {
      try {
        const { api } = await import('../../lib/api');
        const res = await api('/cash/status');
        setCashStatus(res.session);
      } catch { /* noop */ }
    };
    checkCash();
    const interval = setInterval(checkCash, 60000);
    const onCashUpdate = () => checkCash();
    window.addEventListener('cash-status', onCashUpdate);
    return () => { clearInterval(interval); window.removeEventListener('cash-status', onCashUpdate); };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'h-[var(--header-height)] border-b border-border flex items-center justify-between px-5 sticky top-0 z-40 transition-all duration-200',
        scrolled
          ? 'glass-strong shadow-sm'
          : 'bg-card',
      )}
    >
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar}>
          <Menu className="size-5" />
        </Button>
        {cashStatus ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20 shadow-sm">
            <span className="size-2 rounded-full bg-success animate-[pulse-dot_2s_ease-in-out_infinite]" />
            Caja Abierta
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-danger/10 text-danger border border-danger/20 shadow-sm">
            <span className="size-2 rounded-full bg-danger" />
            Caja Cerrada
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <ConnectionStatus />

        <div className="w-px h-5 bg-border mx-1" />

        <Button variant="ghost" size="icon" onClick={toggleDark} className="rounded-full" aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}>
          {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </Button>

        <Button variant="ghost" size="icon" className="rounded-full relative" aria-label="Notificaciones">
          <Bell className="size-5" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger ring-2 ring-card" />
        </Button>
      </div>
    </header>
  );
};
