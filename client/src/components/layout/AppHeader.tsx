import React, { useMemo, useState } from 'react';
import { Sun, Moon, Search, Command, LogOut, Heart } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/userStore';
import { ConnectionStatus } from '../common/ConnectionStatus';
import { Dropdown } from '../ui/Dropdown';
import { Modal } from '../ui/Modal';
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
  const [donateOpen, setDonateOpen] = useState(false);

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
        <span className="text-[9px] text-text-tertiary/40 hidden lg:inline select-none">v1.0</span>
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

        <button
          onClick={() => setDonateOpen(true)}
          className="p-2 rounded-md text-text-tertiary hover:text-danger transition-colors"
          aria-label="Apoyar proyecto"
          title="Apoyar POS Pro"
        >
          <Heart className="size-4" />
        </button>

        <Modal open={donateOpen} onClose={() => setDonateOpen(false)} title="Apoya POS Pro" size="sm">
          <div className="text-center space-y-4">
            <div className="size-14 rounded-full bg-danger/10 flex items-center justify-center mx-auto">
              <Heart className="size-7 text-danger" />
            </div>
            <p className="text-sm text-text-secondary">
              Si te está siendo util, considera apoyar el proyecto para seguir mejorandolo.
            </p>
            <a
              href="https://paypal.me/APVLabs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#0070BA] hover:bg-[#005ea6] text-white text-sm font-bold transition-colors w-full justify-center"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.405 7.201-9.263 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/></svg>
              Donar con PayPal
            </a>
            <p className="text-[10px] text-text-tertiary">@APVLabs</p>
          </div>
        </Modal>

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
