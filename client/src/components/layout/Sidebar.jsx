import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Package, Users, BarChart3, Settings, LogOut, Wallet,
  Shield, ClipboardList, ChevronLeft, Store,
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
          'flex items-center justify-between rounded-2xl text-sm font-semibold transition-all duration-200 group',
          isCollapsed ? 'px-0 py-3 justify-center' : 'px-3.5 py-2.5',
          isActive
            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
            : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover',
        )
      }
      title={isCollapsed ? children : undefined}
    >
      <div className={cn('flex items-center gap-3', isCollapsed && 'justify-center')}>
        <Icon className="size-5 shrink-0" />
        {!isCollapsed && <span className="truncate">{children}</span>}
      </div>
      {shortcut && !isCollapsed && (
        <span className="text-[10px] font-mono tracking-wider opacity-40 border border-current/30 px-1.5 py-0.5 rounded-lg">
          {shortcut}
        </span>
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
  return <Badge variant={v.variant} size="sm">{v.label}</Badge>;
};

export const Sidebar = () => {
  const { hasPermission, role } = usePermissions();
  const { user, logout } = useUserStore();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userName = user?.username || 'Usuario';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <aside
      className={cn(
        'border-r border-border bg-card flex flex-col h-full shrink-0 transition-all duration-300 z-30',
        isCollapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]',
      )}
    >
      {/* Logo */}
      <div className={cn(
        'h-[var(--header-height)] flex items-center border-b border-border shrink-0',
        isCollapsed ? 'justify-center px-0' : 'px-5 justify-between',
      )}>
        <div className="flex items-center gap-2.5">
          <div className="size-10 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-primary/25 shrink-0">
            <Store className="size-5" />
          </div>
          {!isCollapsed && (
            <div>
              <span className="font-bold text-base tracking-tight">POS Pro</span>
              <p className="text-[10px] text-muted-foreground font-semibold tracking-wider">Punto de Venta</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="size-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors flex items-center justify-center"
            aria-label="Colapsar sidebar"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3.5 pt-4 pb-2">
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
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3.5 pt-6 pb-2">
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
      </nav>

      {/* Expand button when collapsed */}
      {isCollapsed && (
        <div className="p-3">
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full py-3 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors flex items-center justify-center"
            aria-label="Expandir sidebar"
          >
            <ChevronLeft className="size-4 rotate-180" />
          </button>
        </div>
      )}

      {/* User section */}
      <div className="p-3 border-t border-border">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-muted/30 border border-border">
              <div className="size-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-sm">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{userName}</p>
                <RoleBadge role={role} />
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl text-sm font-semibold text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut className="size-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 items-center">
            <div className="size-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-sm">
              {userInitial}
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-2xl text-danger hover:bg-danger/10 transition-colors"
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
