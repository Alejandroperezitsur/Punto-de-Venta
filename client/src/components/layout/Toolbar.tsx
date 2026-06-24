import React, { useEffect, useState, useMemo } from 'react';
import { Sun, Moon, Search, Command } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLocation } from 'react-router-dom';
import { ConnectionStatus } from '../common/ConnectionStatus';
import { cn } from '../../utils/cn';

const ROUTE_TITLES: Record<string, string> = {
  '/ventas': 'Ventas',
  '/productos': 'Inventario',
  '/clientes': 'Clientes',
  '/caja': 'Caja',
  '/reportes': 'Reportes',
  '/usuarios': 'Usuarios',
  '/audits': 'Auditoria',
  '/config': 'Configuracion',
  '/branding': 'Personalizacion',
  '/backups': 'Respaldos',
  '/soporte': 'Soporte',
  '/about': 'Acerca de',
  '/admin/metrics': 'Metricas',
  '/admin/enterprise': 'Reportes Enterprise',
};

export const Toolbar = React.memo(function Toolbar() {
  const { isDark, toggleDark } = useTheme();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  const title = useMemo(() => ROUTE_TITLES[location.pathname] || 'Inicio', [location.pathname]);

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

  return (
    <header
      role="banner"
      className={cn(
        'h-[var(--toolbar-height)] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-[var(--z-sticky)] transition-all duration-200',
        scrolled
          ? 'bg-bg-surface/95 backdrop-blur-sm border-b border-border-subtle'
          : 'bg-transparent',
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-semibold text-text-primary truncate">{title}</span>
      </div>

      <div className="flex-1 flex justify-center px-4">
        <button
          onClick={() => document.dispatchEvent(new CustomEvent('trigger-command-palette'))}
          className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-md bg-bg-inset text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover transition-all text-sm border border-transparent hover:border-border-subtle max-w-[320px] w-full justify-between"
          aria-label="Buscar o ejecutar comando"
        >
          <div className="flex items-center gap-2">
            <Search className="size-3.5" />
            <span>Buscar o ejecutar comando...</span>
          </div>
          <kbd className="inline-flex items-center gap-0.5 text-[10px] font-medium text-text-tertiary bg-bg-surface px-1.5 py-0.5 rounded">
            <Command className="size-2.5" />K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1">
        <ConnectionStatus />
        <button
          onClick={toggleDark}
          className="p-2 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover transition-all"
          aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </div>
    </header>
  );
});
