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
          'flex items-center rounded-xl text-[13px] font-medium transition-all duration-200 group relative overflow-hidden',
          isCollapsed ? 'px-0 py-2.5 justify-center mx-2' : 'px-2.5 py-2.5 mx-2',
          isActive
            ? 'bg-surface-sidebar-active text-foreground font-bold sidebar-active-bg shadow-sm shadow-primary/5'
            : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/30',
        )
      }
      aria-label={isCollapsed ? children : undefined}
      title={isCollapsed ? children : undefined}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary transition-all duration-300" />
          )}
          <div className={cn('flex items-center gap-3 w-full', isCollapsed && 'justify-center')}>
            <div className={cn(
              'shrink-0 flex items-center justify-center rounded-lg transition-all duration-200',
              isCollapsed ? 'size-10' : 'size-9',
              isActive
                ? 'bg-primary/12 text-primary'
                : 'text-current group-hover:bg-muted/50 group-hover:scale-105',
            )}>
              <Icon className={cn(
                'shrink-0 transition-transform duration-200',
                isCollapsed ? 'size-[18px]' : 'size-[17px]',
                isActive && 'scale-105',
              )} />
            </div>
            {!isCollapsed && (
              <span className="truncate leading-tight transition-transform duration-200 group-hover:translate-x-0.5">{children}</span>
            )}
          </div>
          {shortcut && !isCollapsed && (
            <span className="text-[9px] font-mono tracking-wider opacity-0 group-hover:opacity-30 border border-current/12 px-1.5 py-0.5 rounded-md transition-opacity ml-auto shrink-0">
              {shortcut}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
});

const SectionLabel = ({ children, isCollapsed }) => {
  if (isCollapsed) return null;
  return (
    <p className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.12em] px-4 pt-4 pb-2 select-none">
      {children}
    </p>
  );
};

const SectionDivider = () => (
  <div className="mx-5 my-2">
    <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, hsl(var(--border) / 0.4) 30%, hsl(var(--border) / 0.4) 70%, transparent 100%)' }} />
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
        'flex flex-col h-full shrink-0 transition-[width] duration-200 ease-out z-[var(--z-sticky)] border-r border-border/10',
        isCollapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]',
      )}
      style={{ background: 'var(--gradient-sidebar)' }}
      aria-label="Navegación principal"
    >
      {/* Logo header */}
      <div className={cn(
        'h-[var(--header-height)] flex items-center shrink-0 border-b border-border/8 relative',
        isCollapsed ? 'justify-center px-0' : 'px-4 justify-between',
      )}>
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] to-transparent" />
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 overflow-hidden ring-1 ring-primary/10 shadow-sm shadow-primary/8 backdrop-blur-sm">
            {branding.logo ? (
              <img src={branding.logo} alt="Logo" className="size-full object-contain p-1.5" />
            ) : (
              <Store className="size-[18px]" />
            )}
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="font-extrabold text-[13px] tracking-tight truncate block leading-tight text-foreground">{branding.businessName}</span>
              <p className="text-[9px] text-muted-foreground/45 font-semibold tracking-[0.08em] truncate block uppercase mt-0.5">{branding.businessSubtitle}</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="size-7 rounded-lg text-muted-foreground/30 hover:text-foreground hover:bg-muted/40 transition-all flex items-center justify-center"
            aria-label="Colapsar sidebar"
          >
            <ChevronLeft className="size-3.5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-1 py-3 space-y-0 overflow-y-auto" aria-label="Navegación principal">
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

      {/* User section */}
      <div className="p-2.5 border-t border-border/8">
        {!isCollapsed ? (
          <div className="rounded-xl backdrop-blur-md bg-surface-glass/40 border border-white/[0.06] p-2.5 space-y-2 shadow-sm">
            <div className="flex items-center gap-2.5 px-1.5 py-1.5">
              <div className="relative shrink-0">
                <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-[11px] ring-2 ring-primary/10 backdrop-blur-sm">
                  {userInitial}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-success border-2 border-card" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate text-foreground/90 leading-tight">{userName}</p>
                <div className="mt-0.5"><RoleBadge role={role} /></div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold text-danger/60 hover:text-danger hover:bg-danger/5 transition-colors touch-target"
            >
              <LogOut className="size-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 items-center">
            <div className="relative">
              <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-[11px] ring-2 ring-primary/10">
                {userInitial}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-success border-2 border-card" />
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-danger/60 hover:text-danger hover:bg-danger/5 transition-colors"
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
