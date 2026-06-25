import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShoppingCart, Package, Users, BarChart3, Settings, Wallet,
  Shield, ClipboardList, Store, Palette, ChevronRight, ChevronLeft, Download,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { usePermissions, PERMISSIONS } from '../../hooks/usePermissions';

interface NavItemData {
  to: string;
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  permission: string;
}

const MAIN_ITEMS: NavItemData[] = [
  { to: '/ventas', icon: ShoppingCart, label: 'Ventas', shortcut: '1', permission: PERMISSIONS.SALES_VIEW },
  { to: '/productos', icon: Package, label: 'Inventario', shortcut: '2', permission: PERMISSIONS.PRODUCTS_VIEW },
  { to: '/clientes', icon: Users, label: 'Clientes', shortcut: '3', permission: PERMISSIONS.CUSTOMERS_VIEW },
  { to: '/reportes', icon: BarChart3, label: 'Reportes', shortcut: '4', permission: PERMISSIONS.REPORTS_VIEW },
  { to: '/caja', icon: Wallet, label: 'Caja', shortcut: '5', permission: PERMISSIONS.CASH_VIEW },
];

const SECONDARY_ITEMS: NavItemData[] = [
  { to: '/usuarios', icon: Shield, label: 'Usuarios', permission: PERMISSIONS.USERS_VIEW },
  { to: '/audits', icon: ClipboardList, label: 'Auditoría', permission: PERMISSIONS.AUDITS_VIEW },
  { to: '/config', icon: Settings, label: 'Configuración', permission: PERMISSIONS.SETTINGS_VIEW },
  { to: '/branding', icon: Palette, label: 'Marca', permission: PERMISSIONS.SETTINGS_VIEW },
  { to: '/download', icon: Download, label: 'Descargar', permission: 'sales:view' },
];

export const RailNav = React.memo(function RailNav({ onNavigate }: { onNavigate?: () => void }) {
  const { hasPermission } = usePermissions();
  const [expanded, setExpanded] = useState(false);
  const [branding, setBranding] = React.useState({ logo: null as string | null, businessName: 'POS Pro' });

  React.useEffect(() => {
    const stored = localStorage.getItem('app_branding');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setBranding({ logo: parsed.logo || null, businessName: parsed.businessName || 'POS Pro' });
      } catch {}
    }
  }, []);

  const NavItem = React.memo(function NavItem({ item }: { item: NavItemData }) {
    if (!hasPermission(item.permission)) return null;
    const Icon = item.icon;
    return (
      <NavLink
        to={item.to}
        onClick={onNavigate}
        className={({ isActive }) => cn(
          'flex items-center rounded-lg transition-all duration-150 group relative',
          expanded ? 'px-3 py-2 mx-2 gap-3' : 'px-0 py-2.5 mx-auto w-10 justify-center',
          isActive
            ? 'bg-bg-surface-active text-text-primary font-semibold'
            : 'text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover',
        )}
        title={!expanded ? item.label : undefined}
      >
        {({ isActive }) => (
          <>
            {isActive && !expanded && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-action-primary" />
            )}
            <div className={cn('shrink-0 flex items-center justify-center', expanded ? 'size-6' : 'size-10')}>
              <Icon className="size-[18px]" strokeWidth={isActive ? 2.5 : 2} />
            </div>
            {expanded && (
              <span className="truncate text-sm">{item.label}</span>
            )}
          </>
        )}
      </NavLink>
    );
  });

  return (
    <nav
      className={cn(
        'flex flex-col h-full shrink-0 transition-[width] duration-200 ease-out',
        'border-r border-border-subtle bg-bg-surface',
        expanded ? 'w-[220px]' : 'w-[56px]',
      )}
      aria-label="Navegación principal"
    >
      {/* Logo */}
      <div className={cn(
        'h-[var(--toolbar-height)] flex items-center shrink-0 border-b border-border-subtle',
        expanded ? 'px-4 gap-3' : 'justify-center',
      )}>
        <div className="size-8 rounded-lg bg-action-primary flex items-center justify-center shrink-0">
          {branding.logo ? (
            <img src={branding.logo} alt="Logo" className="size-6 object-contain" />
          ) : (
            <Store className="size-4 text-[var(--bg-surface)]" />
          )}
        </div>
        {expanded && (
          <span className="font-bold text-sm text-text-primary truncate">{branding.businessName}</span>
        )}
      </div>

      {/* Main nav items */}
      <div className="flex-1 py-3 space-y-0.5 overflow-y-auto">
        {MAIN_ITEMS.map(item => <NavItem key={item.to} item={item} />)}
        <div className="mx-3 my-2 h-px bg-border-subtle" />
        {SECONDARY_ITEMS.map(item => <NavItem key={item.to} item={item} />)}
      </div>

      {/* Expand/collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="h-10 flex items-center justify-center border-t border-border-subtle text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover transition-colors"
        aria-label={expanded ? 'Colapsar menú' : 'Expandir menú'}
      >
        {expanded ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
      </button>
      {expanded && (
        <div className="px-3 py-2 border-t border-border-subtle">
          <p className="text-[9px] text-text-tertiary/50 text-center leading-tight">POS Pro v1.0<br/>APV Labs</p>
        </div>
      )}
    </nav>
  );
});
