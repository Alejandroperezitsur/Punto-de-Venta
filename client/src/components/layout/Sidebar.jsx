import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, Package, Users, BarChart3, Settings, LogOut } from 'lucide-react';
import { cn } from '../../utils/cn';

const NavItem = ({ to, icon: Icon, children }) => {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                        ? "bg-[var(--primary)] text-white shadow-sm"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--bg-muted)] hover:text-[var(--foreground)]"
                )
            }
        >
            <Icon className="h-4 w-4" />
            {children}
        </NavLink>
    );
};

export const Sidebar = () => {
    return (
        <aside className="w-64 border-r border-[var(--border)] bg-[var(--card)] flex flex-col h-screen fixed left-0 top-0 z-50">
            <div className="h-16 flex items-center px-6 border-b border-[var(--border)]">
                <div className="flex items-center gap-2 text-[var(--primary)]">
                    <div className="h-8 w-8 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white font-bold text-lg">
                        P
                    </div>
                    <span className="font-bold text-lg text-[var(--foreground)]">POS System</span>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2 px-3 mt-2">
                    Principal
                </div>
                <NavItem to="/ventas" icon={ShoppingCart}>Ventas</NavItem>
                <NavItem to="/productos" icon={Package}>Productos</NavItem>
                <NavItem to="/clientes" icon={Users}>Clientes</NavItem>

                <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2 px-3 mt-6">
                    Administración
                </div>
                <NavItem to="/reportes" icon={BarChart3}>Reportes</NavItem>
                <NavItem to="/config" icon={Settings}>Configuración</NavItem>
            </nav>

            <div className="p-4 border-t border-[var(--border)]">
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--bg-muted)] mb-2">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                        A
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium truncate text-[var(--foreground)]">Admin</p>
                        <p className="text-xs text-[var(--muted-foreground)] truncate">admin@pos.com</p>
                    </div>
                </div>
                <button className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <LogOut className="h-4 w-4" />
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    );
};
