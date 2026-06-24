import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, Package, Users, BarChart3, Wallet } from 'lucide-react';
import { cn } from '../../utils/cn';

const TABS = [
  { to: '/ventas', icon: ShoppingCart, label: 'Ventas' },
  { to: '/productos', icon: Package, label: 'Prod' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/reportes', icon: BarChart3, label: 'Reportes' },
  { to: '/caja', icon: Wallet, label: 'Caja' },
];

export const TouchBar = React.memo(function TouchBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-[var(--touchbar-height)] bg-bg-surface border-t border-border-subtle flex items-center justify-around z-[var(--z-sticky)] md:hidden"
      aria-label="Navegacion tactil"
    >
      {TABS.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => cn(
            'flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 h-full',
            isActive ? 'text-action-primary' : 'text-text-tertiary',
          )}
        >
          {({ isActive }) => (
            <>
              <tab.icon className="size-6" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
});
