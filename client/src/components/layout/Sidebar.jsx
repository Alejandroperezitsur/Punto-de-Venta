import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Package, Users, BarChart3, Settings, LogOut, Wallet,
  Shield, ClipboardList, ChevronLeft, Store, Palette, ChevronRight,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { usePermissions, PERMISSIONS } from '../../hooks/usePermissions';
import { useUserStore } from '../../store/userStore';
import { Badge } from '../ui/Badge';

const NavItem = React.memo(function NavItem({ to, icon: Icon, children, shortcut = null, show = true, isCollapsed, onNavigate }) {
  if (!show) return null;
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center rounded-xl text-sm font-medium transition-all duration-100 group relative',
          isCollapsed ? 'px-0 py-2.5 justify-center mx-1' : 'px-3 py-2.5 mx-1',
          isActive
            ? 'bg-primary/8 text-primary font-semibold'
            : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover',
        )
      }
      aria-label={isCollapsed ? children : undefined}
      title={isCollapsed ? children : undefined}
    >
      {({ isActive }) => (
        <>
          <div className={cn('flex items-center gap-3', isCollapsed && 'justify-center')}>
            <div className={cn(
              'shrink-0 flex items-center justify-center rounded-lg transition-colors',
              isCollapsed ? 'size-10' : 'size-8',
              isActive ? 'bg-primary/10 text-primary' : 'text-current',
            )}>
              <Icon className={cn('shrink-0', isCollapsed ? 'size-5' : 'size-4')} />
            </div>
            {!isCollapsed && <span className="truncate">{children}</span>}
          </div>
          {shortcut && !isCollapsed && (
            <span className="text-[10px] font-mono tracking-wider opacity-0 group-hover:opacity-30 border border-current/20 px-1.5 py-0.5 rounded-md transition-opacity ml-auto">
              {shortcut}
            </span>
          )}
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
          )}
        </>
      )}
    </NavLink>
  );
});

const RoleBadge = ({ role }) => {
  const variants = {
    admin: { variant: 'danger', label: 'Admin' },
    supervisor: { variant: 'info', label: 'Supervisor' },
    cajero: { variant: 'success', label: 'Cajero' },
  };
  const v = variants[role] || { variant: 'neutral', label: role };
  return <Badge variant={v.variant} size="xs" className="opacity-80">{v.label}</Badge>;
};

export const Sidebar = React.memo(function Sidebar({ onNavigate }) {
  const { hasPermission, role } = usePermissions();
  const { user, logout } = useUserStore();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [branding, setBranding] = React.useState({
    logo: null,
    businessName: 'POS Pro',
    businessSubtitle: 'Punto de Venta'
  });

  React.useEffect(() => {
    const stored = localStorage.getItem('app_branding');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setBranding({
          logo: parsed.logo || null,
          businessName: parsed.businessName || 'POS Pro',
          businessSubtitle: parsed.businessSubtitle || 'Punto de Venta'
        });
      } catch (e) {
        console.error('Failed to parse branding in Sidebar:', e);
      }
    }

    const onBrandingChange = () => {
      const latest = localStorage.getItem('app_branding');
      if (latest) {
        try {
          const parsed = JSON.parse(latest);
          setBranding({
            logo: parsed.logo || null,
            businessName: parsed.businessName || 'POS Pro',
            businessSubtitle: parsed.businessSubtitle || 'Punto de Venta'
          });
        } catch {}
      }
    };
    window.addEventListener('storage', onBrandingChange);
    return () => window.removeEventListener('storage', onBrandingChange);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userName = user?.username || 'Usuario';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <aside
      className={cn(
        'border-r border-border/20 bg-card flex flex-col h-full shrink-0 transition-[width] duration-100 ease-linear z-[var(--z-sticky)]',
        isCollapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]',
      )}
      aria-label="Navegación principal"
    >
      {/* Logo header */}
      <div className={cn(
        'h-[var(--header-height)] flex items-center shrink-0 border-b border-border/15',
        isCollapsed ? 'justify-center px-0' : 'px-4 justify-between',
      )}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-lg bg-primary/8 flex items-center justify-center text-primary shrink-0 overflow-hidden">
            {branding.logo ? (
              <img src={branding.logo} alt="Logo" className="size-full object-contain p-1" />
            ) : (
              <Store className="size-4" />
            )}
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="font-bold text-sm tracking-tight truncate block leading-tight">{branding.businessName}</span>
              <p className="text-[10px] text-muted-foreground/60 font-medium tracking-wider truncate block uppercase">{branding.businessSubtitle}</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="size-7 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all flex items-center justify-center"
            aria-label="Colapsar sidebar"
          >
            <ChevronLeft className="size-3.5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-1.5 py-3 space-y-0.5 overflow-y-auto custom-scrollbar" aria-label="Navegación principal">
        {!isCollapsed && (
          <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.08em] px-4 pt-2 pb-2">
            Principal
          </p>
        )}
        <NavItem to="/ventas" icon={ShoppingCart} show={hasPermission(PERMISSIONS.SALES_VIEW)} isCollapsed={isCollapsed} onNavigate={onNavigate}>
          Ventas
        </NavItem>
        <NavItem to="/productos" icon={Package} show={hasPermission(PERMISSIONS.PRODUCTS_VIEW)} isCollapsed={isCollapsed} onNavigate={onNavigate}>
          Inventario
        </NavItem>
        <NavItem to="/clientes" icon={Users} show={hasPermission(PERMISSIONS.CUSTOMERS_VIEW)} isCollapsed={isCollapsed} onNavigate={onNavigate}>
          Clientes
        </NavItem>

        <div className="my-2 mx-3 border-t border-border/10" />

        {!isCollapsed && (
          <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.08em] px-4 pt-1 pb-2">
            Gestión
          </p>
        )}
        <NavItem to="/caja" icon={Wallet} show={hasPermission(PERMISSIONS.CASH_VIEW)} isCollapsed={isCollapsed} onNavigate={onNavigate}>
          Caja
        </NavItem>
        <NavItem to="/reportes" icon={BarChart3} show={hasPermission(PERMISSIONS.REPORTS_VIEW)} isCollapsed={isCollapsed} onNavigate={onNavigate}>
          Mi Negocio
        </NavItem>
        <NavItem to="/usuarios" icon={Shield} show={hasPermission(PERMISSIONS.USERS_VIEW)} isCollapsed={isCollapsed} onNavigate={onNavigate}>
          Usuarios
        </NavItem>
        <NavItem to="/audits" icon={ClipboardList} show={hasPermission(PERMISSIONS.AUDITS_VIEW)} isCollapsed={isCollapsed} onNavigate={onNavigate}>
          Auditoría
        </NavItem>

        <div className="my-2 mx-3 border-t border-border/10" />

        <NavItem to="/config" icon={Settings} shortcut="F10" show={hasPermission(PERMISSIONS.SETTINGS_VIEW)} isCollapsed={isCollapsed} onNavigate={onNavigate}>
          Configuración
        </NavItem>
        <NavItem to="/branding" icon={Palette} show={hasPermission(PERMISSIONS.SETTINGS_VIEW)} isCollapsed={isCollapsed} onNavigate={onNavigate}>
          Personalización
        </NavItem>
      </nav>

      {/* Collapse expand button */}
      {isCollapsed && (
        <div className="p-2">
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full py-2.5 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center"
            aria-label="Expandir sidebar"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {/* User section */}
      <div className="p-3 border-t border-border/15">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-muted/40 transition-colors">
              <div className="relative shrink-0">
                <div className="size-9 rounded-full bg-primary/8 flex items-center justify-center font-bold text-primary text-xs">
                  {userInitial}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-success border-2 border-card" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate text-foreground/90">{userName}</p>
                <RoleBadge role={role} />
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-danger/70 hover:text-danger hover:bg-danger/5 transition-colors touch-target"
            >
              <LogOut className="size-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 items-center">
            <div className="relative">
              <div className="size-9 rounded-full bg-primary/8 flex items-center justify-center font-bold text-primary text-xs">
                {userInitial}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-success border-2 border-card" />
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-danger/70 hover:text-danger hover:bg-danger/5 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
});
