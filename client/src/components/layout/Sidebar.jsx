import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, Package, Users, BarChart3, Settings, LogOut, Keyboard, Wallet } from 'lucide-react';
import { cn } from '../../utils/cn';

const NavItem = ({ to, icon: Icon, children, shortcut }) => {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                    isActive
                        ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-md scale-[1.02]"
                        : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
                )
            }
        >
            <div className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {children}
            </div>
            {shortcut && (
                <span className="text-[10px] font-mono opacity-50 border border-current px-1 rounded">
                    {shortcut}
                </span>
            )}
        </NavLink>
    );
};

export const Sidebar = () => {
    return (
        <aside className="w-[var(--sidebar-width)] border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col h-full shrink-0 transition-all duration-300">
            <div className="h-[var(--header-height)] flex items-center px-6 border-b border-[hsl(var(--border))]">
                <div className="flex items-center gap-2 text-[hsl(var(--primary))]">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20">
                        P
                    </div>
                    <span className="font-bold text-lg text-[hsl(var(--foreground))] tracking-tight">POS System</span>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <div className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2 px-3 mt-2">
                    Principal
                </div>
                <NavItem to="/ventas" icon={ShoppingCart} shortcut="F2">Ventas</NavItem>
                <NavItem to="/productos" icon={Package} shortcut="F3">Productos</NavItem>
                <NavItem to="/clientes" icon={Users} shortcut="F4">Clientes</NavItem>

                <div className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2 px-3 mt-6">
                    Administración
                </div>
                <NavItem to="/caja" icon={Wallet}>Caja</NavItem>
                <NavItem to="/reportes" icon={BarChart3}>Reportes</NavItem>
                <NavItem to="/config" icon={Settings} shortcut="F10">Configuración</NavItem>
            </nav>

            <div className="p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.3]">
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] mb-3 shadow-sm">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center font-bold text-gray-600">
                        A
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-semibold truncate text-[hsl(var(--foreground))]">Admin</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">admin@pos.com</p>
                    </div>
                </div>
                <button className="flex w-full items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors">
                    <LogOut className="h-4 w-4" />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
};
