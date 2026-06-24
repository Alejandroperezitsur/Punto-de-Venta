import React, { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, Users, BarChart3, Wallet } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Tab {
  to: string;
  icon: React.ElementType;
  label: string;
  shortcut: string;
}

const TABS: Tab[] = [
  { to: '/ventas', icon: ShoppingCart, label: 'Ventas', shortcut: 'Ctrl+1' },
  { to: '/productos', icon: Package, label: 'Productos', shortcut: 'Ctrl+2' },
  { to: '/clientes', icon: Users, label: 'Clientes', shortcut: 'Ctrl+3' },
  { to: '/reportes', icon: BarChart3, label: 'Reportes', shortcut: 'Ctrl+4' },
  { to: '/caja', icon: Wallet, label: 'Caja', shortcut: 'Ctrl+5' },
];

export const TabStrip = React.memo(function TabStrip() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key >= '1' && e.key <= '5') {
        const idx = parseInt(e.key) - 1;
        if (TABS[idx]) {
          e.preventDefault();
          navigate(TABS[idx].to);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  return (
    <nav className="flex items-center h-10 px-4 lg:px-6 border-b border-border-subtle bg-bg-app" aria-label="Navegacion principal">
      {TABS.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => cn(
            'relative flex items-center gap-2 px-3 h-full text-sm font-medium transition-colors',
            'hover:text-text-primary',
            isActive
              ? 'text-text-primary'
              : 'text-text-tertiary',
          )}
        >
          {({ isActive }) => (
            <>
              <tab.icon className={cn('size-4', isActive && 'text-text-primary')} />
              <span className="hidden sm:inline">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-action-primary" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
});
