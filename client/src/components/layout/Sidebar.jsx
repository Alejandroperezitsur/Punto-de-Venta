import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Package, Users, BarChart3, Settings, LogOut, Wallet,
  Shield, ClipboardList, ChevronLeft, Store, Palette, ChevronRight,
  LayoutDashboard,
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
          'flex items-center rounded-xl text-sm font-medium transition-all duration-150 group relative',
          isCollapsed ? 'px-0 py-2 justify-center mx-1.5' : 'px-2.5 py-2.5 mx-1.5',
          isActive
            ? 'bg-primary/[0.11] text-primary font-bold'
            : 'text-muted-foreground/75 hover:text-foreground hover:bg-surface-hover',
        )
      }
      aria-label={isCollapsed ? children : undefined}
      title={isCollapsed ? children : undefined}
    >
      {({ isActive }) => (
        <>
          <div className={cn('flex items-center gap-3 w-full', isCollapsed && 'justify-center')}>
            <div className={cn(
              'shrink-0 flex items-center justify-center rounded-lg transition-all duration-150',
              isCollapsed ? 'size-10' : 'size-9',
              isActive
                ? 'bg-primary/15 text-primary shadow-xs shadow-primary/10'
                : 'text-current group-hover:bg-muted/40',
            )}>
              <Icon className={cn(
                'shrink-0 transition-transform duration-150',
                isCollapsed ? 'size-5' : 'size-[18px]',
                isActive && 'scale-105',
              )} />
            </div>
            {!isCollapsed && (
              <span className="truncate text-[13px] leading-tight">{children}</span>
            )}
          </div>
          {shortcut && !isCollapsed && (
            <span className="text-[9px] font-mono tracking-wider opacity-0 group-hover:opacity-25 border border-current/15 px-1.5 py-0.5 rounded-md transition-opacity ml-auto shrink-0">
              {shortcut}
            </span>
          )}
          {isActive && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
              style={{ height: '60%', background: 'var(--gradient-primary)' }}
            />
          )}
        </>
      )}
    </NavLink>
  );
});

const SectionLabel = ({ children, isCollapsed }) => {
  if (isCollapsed) return null;
  return (
    <p className="text-[9.5px] font-bold text-muted-foreground/35 uppercase tracking-[0.1em] px-4 pt-3 pb-1.5 select-none">
      {children}
    </p>
  );
};

const SectionDivider = () => (
  <div className="mx-4 my-1.5">
    <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--border) / 0.5), transparent)' }} />
  </div>
);

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
        'border-r border-border/15 flex flex-col h-full shrink-0 transition-[width] duration-200 ease-out z-[var(--z-sticky)]',
        isCollapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]',
      )}
      style={{ background: 'var(--gradient-sidebar)' }}
      aria-label="Navegación principal"
    >
      {/* Logo header */}
      <div className={cn(
        'h-[var(--header-height)] flex items-center shrink-0 border-b border-border/10',
        isCollapsed ? 'justify-center px-0' : 'px-4 justify-between',
      )}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-11 rounded-xl bg-primary/[0.09] flex items-center justify-center text-primary shrink-0 overflow-hidden shadow-sm shadow-primary/6 ring-1 ring-primary/8">
            {branding.logo ? (
              <img src={branding.logo} alt="Logo" className="size-full object-contain p-1.5" />
            ) : (
              <Store className="size-5" />
            )}
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="font-extrabold text-[14px] tracking-tight truncate block leading-tight text-foreground">{branding.businessName}</span>
              <p className="text-[9.5px] text-muted-foreground/50 font-semibold tracking-[0.08em] truncate block uppercase mt-0.5">{branding.businessSubtitle}</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="size-7 rounded-lg text-muted-foreground/35 hover:text-foreground hover:bg-muted/50 transition-all flex items-center justify-center"
            aria-label="Colapsar sidebar"
          >
            <ChevronLeft className="size-3.5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-1 py-2.5 space-y-0 overflow-y-auto custom-scrollbar" aria-label="Navegación principal">
        <SectionLabel isCollapsed={isCollapsed}>Principal</SectionLabel>
        <NavItem to="/ventas" icon={ShoppingCart} show={hasPermission(PERMISSIONS.SALES_VIEW)} isCollapsed={isCollapsed} onNavigate={onNavigate}>
          Ventas
        </NavItem>
        <NavItem to="/productos" icon={Package} show={hasPermission(PERMISSIONS.PRODUCTS_VIEW)} isCollapsed={isCollapsed} onNavigate={onNavigate}>
          Inventario
        </NavItem>
        <NavItem to="/clientes" icon={Users} show={hasPermission(PERMISSIONS.CUSTOMERS_VIEW)} isCollapsed={isCollapsed} onNavigate={onNavigate}>
          Clientes
        </NavItem>

        <SectionDivider />

        <SectionLabel isCollapsed={isCollapsed}>Gestión</SectionLabel>
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

        <SectionDivider />

        <SectionLabel isCollapsed={isCollapsed}>Sistema</SectionLabel>
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

      {/* User section — premium card style */}
      <div className="p-2.5 border-t border-border/10">
        {!isCollapsed ? (
          <div className="rounded-xl bg-muted/20 border border-border/10 p-2.5 space-y-2">
            <div className="flex items-center gap-2.5 px-1.5 py-1.5">
              <div className="relative shrink-0">
                <div className="size-10 rounded-full bg-primary/12 flex items-center justify-center font-bold text-primary text-xs ring-2 ring-primary/12 shadow-sm">
                  {userInitial}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-success border-2 border-card shadow-sm shadow-success/20" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate text-foreground/90 leading-tight">{userName}</p>
                <div className="mt-0.5"><RoleBadge role={role} /></div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-danger/65 hover:text-danger hover:bg-danger/5 transition-colors touch-target"
            >
              <LogOut className="size-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 items-center">
            <div className="relative">
              <div className="size-10 rounded-full bg-primary/12 flex items-center justify-center font-bold text-primary text-xs ring-2 ring-primary/12 shadow-sm">
                {userInitial}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-success border-2 border-card shadow-sm shadow-success/20" />
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-danger/65 hover:text-danger hover:bg-danger/5 transition-colors"
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
