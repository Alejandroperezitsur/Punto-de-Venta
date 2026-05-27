import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Package, Users, BarChart3, Settings, LogOut, Wallet,
  Shield, ClipboardList, ChevronLeft, Store, Palette,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { usePermissions, PERMISSIONS } from '../../hooks/usePermissions';
import { useUserStore } from '../../store/userStore';
import { Badge } from '../ui/Badge';

const NavItem = ({ to, icon: Icon, children, shortcut = null, show = true, isCollapsed }) => {
  if (!show) return null;
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center justify-between rounded-xl text-sm font-medium transition-all duration-300 group relative',
          isCollapsed ? 'px-0 py-3 justify-center' : 'px-4 py-3',
          isActive
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover',
        )
      }
      aria-label={isCollapsed ? children : undefined}
      title={isCollapsed ? children : undefined}
    >
      {({ isActive }) => (
        <>
          <div className={cn('flex items-center gap-3.5', isCollapsed && 'justify-center')}>
            <Icon className={cn("size-5 shrink-0 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
            {!isCollapsed && <span className="truncate">{children}</span>}
          </div>
          {shortcut && !isCollapsed && (
            <span className="text-[10px] font-mono tracking-wider opacity-0 group-hover:opacity-40 border border-current/30 px-1.5 py-0.5 rounded-lg transition-opacity">
              {shortcut}
            </span>
          )}
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
          )}
        </>
      )}
    </NavLink>
  );
};

const RoleBadge = ({ role }) => {
  const variants = {
    admin: { variant: 'danger', label: 'Admin' },
    supervisor: { variant: 'info', label: 'Supervisor' },
    cajero: { variant: 'success', label: 'Cajero' },
  };
  const v = variants[role] || { variant: 'neutral', label: role };
  return <Badge variant={v.variant} size="sm" className="opacity-80 scale-90 origin-left">{v.label}</Badge>;
};

export const Sidebar = () => {
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

    // Escuchar cambios de branding locales
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
          'border-r border-border/30 bg-card flex flex-col h-full shrink-0 transition-all duration-300 z-30',
          isCollapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]',
        )}
      >
      {/* Logo */}
      <div className={cn(
        'h-[var(--header-height)] flex items-center shrink-0 border-b border-border/30',
        isCollapsed ? 'justify-center px-0' : 'px-6 justify-between',
      )}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 overflow-hidden">
            {branding.logo ? (
              <img src={branding.logo} alt="Logo" className="size-full object-contain p-1" />
            ) : (
              <Store className="size-5" />
            )}
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="font-extrabold text-sm tracking-tight truncate block">{branding.businessName}</span>
              <p className="text-[10px] text-muted-foreground font-semibold tracking-wider truncate block uppercase">{branding.businessSubtitle}</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="size-7 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-all flex items-center justify-center"
            aria-label="Colapsar sidebar"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar" aria-label="Navegación principal">
        {!isCollapsed && (
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest px-4 pt-2 pb-3">
            Principal
          </p>
        )}
        <NavItem to="/ventas" icon={ShoppingCart} shortcut="F2" show={hasPermission(PERMISSIONS.SALES_VIEW)} isCollapsed={isCollapsed}>
          Ventas
        </NavItem>
        <NavItem to="/productos" icon={Package} shortcut="F3" show={hasPermission(PERMISSIONS.PRODUCTS_VIEW)} isCollapsed={isCollapsed}>
          Inventario
        </NavItem>
        <NavItem to="/clientes" icon={Users} shortcut="F4" show={hasPermission(PERMISSIONS.CUSTOMERS_VIEW)} isCollapsed={isCollapsed}>
          Clientes
        </NavItem>

        {!isCollapsed && (
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest px-4 pt-6 pb-3">
            Administración
          </p>
        )}
        <NavItem to="/caja" icon={Wallet} show={hasPermission(PERMISSIONS.CASH_VIEW)} isCollapsed={isCollapsed}>
          Caja
        </NavItem>
        <NavItem to="/reportes" icon={BarChart3} show={hasPermission(PERMISSIONS.REPORTS_VIEW)} isCollapsed={isCollapsed}>
          Mi Negocio
        </NavItem>
        <NavItem to="/usuarios" icon={Shield} show={hasPermission(PERMISSIONS.USERS_VIEW)} isCollapsed={isCollapsed}>
          Usuarios
        </NavItem>
        <NavItem to="/audits" icon={ClipboardList} show={hasPermission(PERMISSIONS.AUDITS_VIEW)} isCollapsed={isCollapsed}>
          Auditoría
        </NavItem>
        <NavItem to="/config" icon={Settings} shortcut="F10" show={hasPermission(PERMISSIONS.SETTINGS_VIEW)} isCollapsed={isCollapsed}>
          Configuración
        </NavItem>
        <NavItem to="/branding" icon={Palette} show={hasPermission(PERMISSIONS.SETTINGS_VIEW)} isCollapsed={isCollapsed}>
          Personalización
        </NavItem>
      </nav>

      {/* Expand button when collapsed */}
      {isCollapsed && (
        <div className="p-3">
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center"
            aria-label="Expandir sidebar"
          >
            <ChevronLeft className="size-4 rotate-180" />
          </button>
        </div>
      )}

      {/* User section */}
      <div className="p-4 border-t border-border/30">
        {!isCollapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/50 transition-colors">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate text-foreground/90">{userName}</p>
                <RoleBadge role={role} />
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-danger/80 hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut className="size-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 items-center">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
              {userInitial}
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl text-danger/80 hover:text-danger hover:bg-danger/10 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="size-5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
