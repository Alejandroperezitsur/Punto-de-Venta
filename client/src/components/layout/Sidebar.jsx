import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, Users, BarChart3, Settings, LogOut, Wallet, Shield, ClipboardList, HardDrive, Info } from 'lucide-react';
import { cn } from '../../utils/cn';
import { usePermissions, PERMISSIONS } from '../../hooks/usePermissions';
import { useAppStore } from '../../store/useAppStore';

const NavItem = ({ to, icon: Icon, children, shortcut, show = true }) => {
    if (!show) return null;
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

const RoleBadge = ({ role }) => {
    const colors = {
        admin: 'bg-red-100 text-red-700 border-red-200',
        supervisor: 'bg-blue-100 text-blue-700 border-blue-200',
        cajero: 'bg-green-100 text-green-700 border-green-200',
    };
    const labels = { admin: 'Admin', supervisor: 'Supervisor', cajero: 'Cajero' };
    return (
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-semibold uppercase", colors[role] || 'bg-gray-100 text-gray-700')}>
            {labels[role] || role}
        </span>
    );
};

export const Sidebar = () => {
    const { hasPermission, role } = usePermissions();
    const { user, logout } = useAppStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const userName = user?.username || 'Usuario';
    const userInitial = userName.charAt(0).toUpperCase();

    return (
        <aside className="w-[var(--sidebar-width)] border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col h-full shrink-0 transition-all duration-300">
            <div className="h-[var(--header-height)] flex items-center px-6 border-b border-[hsl(var(--border))]">
                <div className="flex items-center gap-2 text-[hsl(var(--primary))]">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20">
                        P
                    </div>
                    <span className="font-bold text-lg text-[hsl(var(--foreground))] tracking-tight">POS Pro</span>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <div className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2 px-3 mt-2">
                    Principal
                </div>
                <NavItem to="/ventas" icon={ShoppingCart} shortcut="F2" show={hasPermission(PERMISSIONS.SALES_VIEW)}>Ventas</NavItem>
                <NavItem to="/productos" icon={Package} shortcut="F3" show={hasPermission(PERMISSIONS.PRODUCTS_VIEW)}>Inventario</NavItem>
                <NavItem to="/clientes" icon={Users} shortcut="F4" show={hasPermission(PERMISSIONS.CUSTOMERS_VIEW)}>Clientes</NavItem>

                <div className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2 px-3 mt-6">
                    Administración
                </div>
                <NavItem to="/caja" icon={Wallet} show={hasPermission(PERMISSIONS.CASH_VIEW)}>Caja</NavItem>
                <NavItem to="/reportes" icon={BarChart3} show={hasPermission(PERMISSIONS.REPORTS_VIEW)}>Reportes</NavItem>
                <NavItem to="/usuarios" icon={Shield} show={hasPermission(PERMISSIONS.USERS_VIEW)}>Usuarios</NavItem>
                <NavItem to="/audits" icon={ClipboardList} show={hasPermission(PERMISSIONS.AUDITS_VIEW)}>Auditoría</NavItem>
                <NavItem to="/backups" icon={HardDrive} show={hasPermission(PERMISSIONS.SETTINGS_VIEW)}>Respaldos</NavItem>
                <NavItem to="/config" icon={Settings} shortcut="F10" show={hasPermission(PERMISSIONS.SETTINGS_VIEW)}>Configuración</NavItem>
                <NavItem to="/about" icon={Info} show={true}>Acerca de</NavItem>
            </nav>

            <div className="p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.3]">
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] mb-3 shadow-sm">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-blue-600 flex items-center justify-center font-bold text-white text-sm">
                        {userInitial}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-semibold truncate text-[hsl(var(--foreground))]">{userName}</p>
                        <RoleBadge role={role} />
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
                >
                    <LogOut className="h-4 w-4" />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
};
