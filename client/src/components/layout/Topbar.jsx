import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Sun, Moon, Bell, Menu } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useUserStore } from '../../store/userStore';
import { Button } from '../ui/Button';
import { ConnectionStatus } from '../common/ConnectionStatus';
import { cn } from '../../utils/cn';

export const Topbar = React.memo(function Topbar() {
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

  return (
    <header
      role="banner"
      className={cn(
        'h-12 border-b border-border/30 flex items-center justify-between px-3 sticky top-0 z-[var(--z-sticky)] transition-colors',
        scrolled
          ? 'bg-background/90 backdrop-blur-sm shadow-sm'
          : 'bg-transparent',
      )}
    >
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-2 -ml-1.5 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors touch-target"
          onClick={toggleSidebar}
          aria-label="Menú"
        >
          <Menu className="w-4 h-4" />
        </button>

        {cashStatus ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-success/5 text-success/90 font-medium text-[10px] border border-success/10">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Caja Abierta
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-danger/5 text-danger/90 font-medium text-[10px] border border-danger/10">
            <span className="w-1.5 h-1.5 rounded-full bg-danger opacity-70" />
            Caja Cerrada
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <ConnectionStatus />

        <div className="w-px h-3 bg-border/50 mx-1.5" />

        <button
          onClick={toggleDark}
          className="p-2 rounded-md text-muted-foreground/70 hover:bg-muted/50 hover:text-foreground transition-colors touch-target"
          aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        <button
          className="p-2 rounded-md text-muted-foreground/70 hover:bg-muted/50 hover:text-foreground transition-colors relative touch-target"
          aria-label="Notificaciones"
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="absolute top-2 right-2 w-1 h-1 rounded-full bg-danger" />
        </button>
      </div>
    </header>
  );
});
