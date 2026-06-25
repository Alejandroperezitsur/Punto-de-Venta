import React, { useMemo } from 'react';
import { Sun, Moon, Search, Command, LogOut } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/userStore';
import { ConnectionStatus } from '../common/ConnectionStatus';
import { Dropdown } from '../ui/Dropdown';
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
  '/branding': 'Marca',
  '/backups': 'Respaldos',
  '/soporte': 'Soporte',
  '/about': 'Acerca de',
  '/admin/metrics': 'Metricas',
  '/admin/enterprise': 'Enterprise',
  '/insights': 'Insights',
  '/theme-studio': 'Tema',
  '/billing': 'Facturacion',
};

export const AppHeader = React.memo(function AppHeader() {
  const { isDark, toggleDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useUserStore();

  const title = useMemo(() => ROUTE_TITLES[location.pathname] || 'Inicio', [location.pathname]);

  const userInitial = user?.username?.charAt(0).toUpperCase() || 'U';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      className={cn(
        'h-[var(--toolbar-height)] flex items-center justify-between px-4 lg:px-6',
        'border-b border-border-subtle bg-bg-surface shrink-0',
      )}
      role="banner"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-semibold text-text-primary truncate">{title}</span>
      </div>

      <div className="flex-1 flex justify-center px-4">
        <button
          onClick={() => document.dispatchEvent(new CustomEvent('trigger-command-palette'))}
          className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-md bg-bg-inset text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover transition-colors text-sm border border-transparent hover:border-border-subtle max-w-[320px] w-full justify-between"
          aria-label="Buscar o ejecutar comando (Ctrl+K)"
        >
          <div className="flex items-center gap-2">
            <Search className="size-3.5" />
            <span>Comando rapido...</span>
          </div>
          <kbd className="inline-flex items-center gap-0.5 text-[10px] font-medium text-text-tertiary bg-bg-surface px-1.5 py-0.5 rounded-md border border-border-subtle">
            <Command className="size-2.5" />K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1">
        <ConnectionStatus />
        <button
          onClick={toggleDark}
          className="p-2 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover transition-colors"
          aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        <Dropdown
          align="right"
          trigger={
            <button className="size-8 rounded-lg bg-bg-inset flex items-center justify-center text-sm font-bold text-text-secondary hover:bg-bg-surface-hover transition-colors ml-1">
              {userInitial}
            </button>
          }
          items={[
            { label: user?.username || 'Usuario', divider: true },
            { label: 'Cerrar Sesion', icon: LogOut, onClick: handleLogout, danger: true },
          ]}
        />
      </div>
    </header>
  );
});
