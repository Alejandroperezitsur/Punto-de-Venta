import React, { useEffect, useState } from 'react';
import { Sun, Moon, Bell, Menu } from 'lucide-react';
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
      role="banner"
      className={cn(
        'h-[var(--header-height)] border-b border-border/40 flex items-center justify-between px-6 sticky top-0 z-40 transition-all duration-300',
        scrolled
          ? 'bg-background/70 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)]'
          : 'bg-transparent',
      )}
    >
      <div className="flex items-center gap-5">
        <button
          className="lg:hidden p-2 -ml-2 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          onClick={toggleSidebar}
          aria-label="Menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        {cashStatus ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/5 text-success/90 font-medium text-xs border border-success/10">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Caja Abierta
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-danger/5 text-danger/90 font-medium text-xs border border-danger/10">
            <span className="w-1.5 h-1.5 rounded-full bg-danger opacity-70" />
            Caja Cerrada
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <ConnectionStatus />

        <div className="w-px h-4 bg-border/50 mx-2" />

        <button
          onClick={toggleDark}
          className="p-2.5 rounded-xl text-muted-foreground/70 hover:bg-muted/50 hover:text-foreground transition-all active:scale-95"
          aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          className="p-2.5 rounded-xl text-muted-foreground/70 hover:bg-muted/50 hover:text-foreground transition-all active:scale-95 relative"
          aria-label="Notificaciones"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-danger" />
        </button>
      </div>
    </header>
  );
};
