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
        'h-13 flex items-center justify-between px-4 sticky top-0 z-[var(--z-sticky)] transition-all duration-150',
        scrolled
          ? 'bg-background/90 backdrop-blur-md shadow-sm'
          : 'bg-transparent',
      )}
    >
      {/* Bottom gradient border */}
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.15), transparent)' }} />

      <div className="flex items-center gap-2.5">
        <button
          className="lg:hidden p-2 -ml-1 rounded-lg text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors touch-target"
          onClick={toggleSidebar}
          aria-label="Menú"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Cash register status */}
        {cashStatus ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-success/8 text-success text-[11px] font-semibold border border-success/12 shadow-sm shadow-success/5">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-40" />
              <span className="relative inline-flex rounded-full size-2 bg-success" />
            </span>
            <span className="hidden sm:inline">Caja Abierta</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-danger/8 text-danger text-[11px] font-semibold border border-danger/12 shadow-sm shadow-danger/5">
            <span className="w-2 h-2 rounded-full bg-danger/70" />
            <span className="hidden sm:inline">Caja Cerrada</span>
          </div>
        )}
      </div>

      {/* Center: Time display */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 text-sm">
        <Clock className="size-4 text-primary/40" />
        <span className="tabular-nums font-bold text-foreground">{timeStr}</span>
        <span className="hidden md:inline text-muted-foreground/50 text-xs font-medium">{dateStr}</span>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-1">
        <ConnectionStatus />

        <div className="w-px h-4 bg-border/30 mx-2" />

        <button
          onClick={toggleDark}
          className="p-2 rounded-xl text-muted-foreground/60 hover:bg-muted/40 hover:text-foreground transition-all hover:scale-105 touch-target"
          aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          className="p-2 rounded-xl text-muted-foreground/60 hover:bg-muted/40 hover:text-foreground transition-all hover:scale-105 relative touch-target"
          aria-label="Notificaciones"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger shadow-sm shadow-danger/20" />
        </button>
      </div>
    </header>
  );
});
