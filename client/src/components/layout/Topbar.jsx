import React, { useEffect, useState, useCallback } from 'react';
import { Sun, Moon, Bell, Menu, Wifi, WifiOff, Clock } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useUserStore } from '../../store/userStore';
import { ConnectionStatus } from '../common/ConnectionStatus';
import { cn } from '../../utils/cn';

function useCurrentTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);
  return time;
}

export const Topbar = React.memo(function Topbar() {
  const { isDark, toggleDark } = useTheme();
  const { toggleSidebar } = useUserStore();
  const [cashStatus, setCashStatus] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const currentTime = useCurrentTime();

  useEffect(() => {
    const checkCash = async () => {
      try {
        const { api } = await import('../../lib/api');
        const res = await api('/cash/status');
        setCashStatus(res.session);
      } catch { /* noop */ }
    };
    checkCash();
    const interval = setInterval(checkCash, 120000);
    const onCashUpdate = () => checkCash();
    window.addEventListener('cash-status', onCashUpdate);
    return () => { clearInterval(interval); window.removeEventListener('cash-status', onCashUpdate); };
  }, []);

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(main.scrollTop > 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <header
      role="banner"
      className={cn(
        'h-12 border-b border-border/15 flex items-center justify-between px-3 sticky top-0 z-[var(--z-sticky)] transition-all duration-100',
        scrolled
          ? 'bg-background/85 backdrop-blur-md shadow-xs'
          : 'bg-transparent',
      )}
    >
      <div className="flex items-center gap-2">
        <button
          className="lg:hidden p-2 -ml-1 rounded-lg text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors touch-target"
          onClick={toggleSidebar}
          aria-label="Menú"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Cash register status */}
        {cashStatus ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-success/6 text-success text-[11px] font-semibold border border-success/10">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            <span className="hidden sm:inline">Caja Abierta</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-danger/6 text-danger text-[11px] font-semibold border border-danger/10">
            <span className="w-1.5 h-1.5 rounded-full bg-danger/70" />
            <span className="hidden sm:inline">Caja Cerrada</span>
          </div>
        )}
      </div>

      {/* Center: Time display */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Clock className="size-3.5 opacity-50" />
        <span className="tabular-nums font-semibold text-foreground/80">{timeStr}</span>
        <span className="hidden md:inline text-muted-foreground/50">{dateStr}</span>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-0.5">
        <ConnectionStatus />

        <div className="w-px h-3.5 bg-border/30 mx-1.5" />

        <button
          onClick={toggleDark}
          className="p-2 rounded-lg text-muted-foreground/60 hover:bg-muted/40 hover:text-foreground transition-colors touch-target"
          aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        <button
          className="p-2 rounded-lg text-muted-foreground/60 hover:bg-muted/40 hover:text-foreground transition-colors relative touch-target"
          aria-label="Notificaciones"
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-danger" />
        </button>
      </div>
    </header>
  );
});
