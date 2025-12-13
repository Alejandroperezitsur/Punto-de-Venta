import { useAppStore } from '../store/useAppStore';

/**
 * Permission constants matching backend
 */
export const PERMISSIONS = {
    SALES_VIEW: 'sales:view',
    SALES_CREATE: 'sales:create',
    SALES_DELETE: 'sales:delete',
    PRODUCTS_VIEW: 'products:view',
    PRODUCTS_CREATE: 'products:create',
    PRODUCTS_EDIT: 'products:edit',
    PRODUCTS_DELETE: 'products:delete',
    CUSTOMERS_VIEW: 'customers:view',
    CUSTOMERS_CREATE: 'customers:create',
    CUSTOMERS_EDIT: 'customers:edit',
    CUSTOMERS_DELETE: 'customers:delete',
    CASH_VIEW: 'cash:view',
    CASH_OPEN: 'cash:open',
    CASH_CLOSE: 'cash:close',
    CASH_WITHDRAW: 'cash:withdraw',
    CASH_DEPOSIT: 'cash:deposit',
    REPORTS_VIEW: 'reports:view',
    REPORTS_EXPORT: 'reports:export',
    INVENTORY_VIEW: 'inventory:view',
    INVENTORY_ADJUST: 'inventory:adjust',
    SETTINGS_VIEW: 'settings:view',
    SETTINGS_EDIT: 'settings:edit',
    USERS_VIEW: 'users:view',
    USERS_CREATE: 'users:create',
    USERS_EDIT: 'users:edit',
    USERS_DELETE: 'users:delete',
    AUDITS_VIEW: 'audits:view',
};

const ROLE_PERMISSIONS = {
    admin: Object.values(PERMISSIONS),
    supervisor: [
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.SALES_CREATE,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.PRODUCTS_CREATE,
        PERMISSIONS.PRODUCTS_EDIT,
        PERMISSIONS.CUSTOMERS_VIEW,
        PERMISSIONS.CUSTOMERS_CREATE,
        PERMISSIONS.CUSTOMERS_EDIT,
        PERMISSIONS.CASH_VIEW,
        PERMISSIONS.CASH_OPEN,
        PERMISSIONS.CASH_CLOSE,
        PERMISSIONS.CASH_WITHDRAW,
        PERMISSIONS.CASH_DEPOSIT,
        PERMISSIONS.REPORTS_VIEW,
        PERMISSIONS.REPORTS_EXPORT,
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.INVENTORY_ADJUST,
        PERMISSIONS.AUDITS_VIEW,
    ],
    cajero: [
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.SALES_CREATE,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.CUSTOMERS_VIEW,
        PERMISSIONS.CUSTOMERS_CREATE,
        PERMISSIONS.CASH_VIEW,
        PERMISSIONS.CASH_OPEN,
        PERMISSIONS.CASH_CLOSE,
        PERMISSIONS.CASH_DEPOSIT,
    ],
};

/**
 * Hook to check user permissions
 */
export const usePermissions = () => {
    const user = useAppStore(state => state.user);
    const role = user?.role || 'cajero';

    const hasPermission = (permission) => {
        const perms = ROLE_PERMISSIONS[role] || [];
        return perms.includes(permission);
    };

    const hasAnyPermission = (...permissions) => {
        return permissions.some(p => hasPermission(p));
    };

    const hasAllPermissions = (...permissions) => {
        return permissions.every(p => hasPermission(p));
    };

    const isAdmin = () => role === 'admin';
    const isSupervisor = () => role === 'supervisor';
    const isCajero = () => role === 'cajero';

    return {
        role,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isAdmin,
        isSupervisor,
        isCajero,
        PERMISSIONS,
    };
};

export default usePermissions;
