import React, { useEffect, useState, useMemo } from 'react';
import { Sun, Moon, Bell, Menu, Clock, Search, Command } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useUserStore } from '../../store/userStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { ConnectionStatus } from '../common/ConnectionStatus';
import { cn } from '../../utils/cn';

const ROUTE_TITLES = {
  '/ventas': 'Ventas',
  '/productos': 'Inventario',
  '/clientes': 'Clientes',
  '/caja': 'Control de Caja',
  '/reportes': 'Mi Negocio',
  '/usuarios': 'Usuarios',
  '/audits': 'Auditoría',
  '/config': 'Configuración',
  '/branding': 'Personalización',
  '/insights': 'AI Insights',
  '/billing': 'Suscripción',
  '/backups': 'Respaldos',
  '/soporte': 'Soporte',
  '/about': 'Acerca de',
  '/admin/metrics': 'Métricas',
  '/admin/enterprise': 'Reportes Enterprise',
};

function useCurrentTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 10000);
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
  const location = useLocation();
  const navigate = useNavigate();

  const pageTitle = useMemo(() => {
    return ROUTE_TITLES[location.pathname] || 'POS Pro';
  }, [location.pathname]);

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
          setScrolled(main.scrollTop > 8);
          ticking = false;
        });
        ticking = true;
      }
    };
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const dateStrShort = currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <header
      role="banner"
      className={cn(
        'h-[var(--header-height)] flex items-center justify-between px-4 lg:px-5 sticky top-0 z-[var(--z-sticky)] transition-all duration-200',
        scrolled
          ? 'bg-background/85 backdrop-blur-xl shadow-sm shadow-black/[0.03]'
          : 'bg-background/60 backdrop-blur-sm',
      )}
    >
      {/* Bottom gradient accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent 5%, hsl(var(--primary) / 0.12) 30%, hsl(var(--accent) / 0.08) 70%, transparent 95%)' }}
      />

      {/* Left: Menu + Page title + Cash status */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          className="lg:hidden p-2 -ml-1 rounded-lg text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors touch-target"
          onClick={toggleSidebar}
          aria-label="Menú"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Page title */}
        <div className="hidden sm:flex items-center gap-2 min-w-0">
          <h1 className="text-sm font-bold text-foreground truncate leading-tight">{pageTitle}</h1>
        </div>

        {/* Cash register status — compact pill */}
        {cashStatus ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/8 text-success text-[10px] font-bold border border-success/10 shadow-xs shadow-success/5">
            <span className="relative flex size-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-40" />
              <span className="relative inline-flex rounded-full size-1.5 bg-success" />
            </span>
            <span className="hidden sm:inline">Caja Abierta</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger/6 text-danger text-[10px] font-bold border border-danger/10 shadow-xs shadow-danger/3">
            <span className="w-1.5 h-1.5 rounded-full bg-danger/60" />
            <span className="hidden sm:inline">Caja Cerrada</span>
          </div>
        )}
      </div>

      {/* Center: Clock */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        <Clock className="size-3.5 text-primary/35" />
        <span className="tabular-nums font-bold text-foreground text-sm tracking-tight">{timeStr}</span>
        <span className="hidden lg:inline text-muted-foreground/40 text-xs font-medium">{dateStrShort}</span>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1">
        {/* Quick search trigger (Cmd+K) */}
        <button
          onClick={() => document.dispatchEvent(new CustomEvent('trigger-command-palette'))}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/25 bg-muted/20 text-muted-foreground/50 hover:text-foreground hover:border-border/40 hover:bg-muted/30 transition-all text-xs font-medium touch-target"
          aria-label="Buscar (Cmd+K)"
        >
          <Search className="size-3.5" />
          <span className="hidden xl:inline">Buscar...</span>
          <kbd className="hidden xl:inline-flex items-center gap-0.5 text-[9px] font-bold bg-muted/60 px-1.5 py-0.5 rounded border border-border/20">
            <Command className="size-2.5" />K
          </kbd>
        </button>

        <div className="w-px h-4 bg-border/25 mx-1.5" />

        <ConnectionStatus />

        <button
          onClick={toggleDark}
          className="p-2 rounded-lg text-muted-foreground/50 hover:bg-muted/30 hover:text-foreground transition-all touch-target"
          aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          className="p-2 rounded-lg text-muted-foreground/50 hover:bg-muted/30 hover:text-foreground transition-all relative touch-target"
          aria-label="Notificaciones"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-danger shadow-sm shadow-danger/20 ring-1 ring-card" />
        </button>
      </div>
    </header>
  );
});
