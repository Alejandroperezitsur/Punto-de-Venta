import React, { useEffect, useState, useMemo } from 'react';
import { Sun, Moon, Bell, Menu, Search, Command, ChevronRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useUserStore } from '../../store/userStore';
import { useLocation } from 'react-router-dom';
import { ConnectionStatus } from '../common/ConnectionStatus';
import { StatusIndicator } from '../ui/StatusIndicator';
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

const ROUTE_BREADCRUMB = {
  '/ventas': ['POS', 'Ventas'],
  '/productos': ['Inventario', 'Productos'],
  '/clientes': ['CRM', 'Clientes'],
  '/caja': ['Operaciones', 'Caja'],
  '/reportes': ['Analytics', 'Reportes'],
  '/usuarios': ['Admin', 'Usuarios'],
  '/audits': ['Admin', 'Auditoría'],
  '/config': ['Sistema', 'Config'],
  '/branding': ['Sistema', 'Branding'],
  '/insights': ['Analytics', 'AI Insights'],
  '/billing': ['Sistema', 'Suscripción'],
  '/backups': ['Sistema', 'Respaldos'],
  '/soporte': ['Ayuda', 'Soporte'],
  '/about': ['Ayuda', 'Acerca de'],
  '/admin/metrics': ['Admin', 'Métricas'],
  '/admin/enterprise': ['Admin', 'Enterprise'],
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

  const breadcrumb = useMemo(() => {
    return ROUTE_BREADCRUMB[location.pathname] || ['POS', 'Inicio'];
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

  const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStrShort = currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <header
      role="banner"
      className={cn(
        'h-[var(--header-height)] flex items-center justify-between px-4 lg:px-5 sticky top-0 z-[var(--z-sticky)] transition-all duration-300',
        scrolled
          ? 'bg-background/90 backdrop-blur-xl shadow-[0_1px_3px_0_rgb(0_0_0/0.03)]'
          : 'bg-background/70 backdrop-blur-md',
      )}
    >
      {/* Hairline bottom border with gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px opacity-60"
        style={{ background: 'linear-gradient(90deg, transparent 2%, hsl(var(--border) / 0.4) 20%, hsl(var(--border) / 0.6) 50%, hsl(var(--border) / 0.4) 80%, transparent 98%)' }}
      />

      {/* Left: Menu + Breadcrumb + Cash status */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          className="lg:hidden p-2 -ml-1 rounded-lg text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors touch-target"
          onClick={toggleSidebar}
          aria-label="Menú"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Breadcrumb-style page path */}
        <nav className="hidden sm:flex items-center gap-1 min-w-0" aria-label="Breadcrumb">
          <span className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wider">{breadcrumb[0]}</span>
          <ChevronRight className="size-3 text-muted-foreground/30 shrink-0" />
          <span className="text-sm font-bold text-foreground truncate">{breadcrumb[1]}</span>
        </nav>

        {/* Cash register status */}
        {cashStatus !== null && (
          <div className="hidden md:block ml-1">
            <StatusIndicator
              variant={cashStatus ? 'live' : 'idle'}
              label={cashStatus ? 'Caja Abierta' : 'Caja Cerrada'}
              size="sm"
              pulse={!!cashStatus}
            />
          </div>
        )}
      </div>

      {/* Center: Refined clock with date pill */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/25 border border-border/10">
          <span className="tabular-nums font-bold text-foreground text-[13px] tracking-tight">{timeStr}</span>
          <span className="w-px h-3 bg-border/30" />
          <span className="text-muted-foreground/60 text-[11px] font-medium">{dateStrShort}</span>
        </div>
      </div>

      {/* Right: Grouped controls */}
      <div className="flex items-center gap-0.5">
        {/* Search trigger (Cmd+K) */}
        <button
          onClick={() => document.dispatchEvent(new CustomEvent('trigger-command-palette'))}
          className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/30 transition-all touch-target"
          aria-label="Buscar (Cmd+K)"
        >
          <Search className="size-3.5" />
          <span className="hidden xl:inline text-xs font-medium">Buscar...</span>
          <kbd className="hidden xl:inline-flex items-center gap-0.5 text-[9px] font-bold text-muted-foreground/40 bg-muted/40 px-1.5 py-0.5 rounded border border-border/15">
            <Command className="size-2.5" />K
          </kbd>
        </button>

        <div className="w-px h-4 bg-border/15 mx-1" />

        <ConnectionStatus />

        <div className="w-px h-4 bg-border/15 mx-1" />

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
