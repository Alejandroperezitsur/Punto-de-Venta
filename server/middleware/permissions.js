/**
 * Permissions System for POS
 * Defines granular permissions for each role
 */

const PERMISSIONS = {
    // Sales Module
    SALES_VIEW: 'sales:view',
    SALES_CREATE: 'sales:create',
    SALES_DELETE: 'sales:delete',

    // Products Module
    PRODUCTS_VIEW: 'products:view',
    PRODUCTS_CREATE: 'products:create',
    PRODUCTS_EDIT: 'products:edit',
    PRODUCTS_DELETE: 'products:delete',

    // Customers Module
    CUSTOMERS_VIEW: 'customers:view',
    CUSTOMERS_CREATE: 'customers:create',
    CUSTOMERS_EDIT: 'customers:edit',
    CUSTOMERS_DELETE: 'customers:delete',

    // Cash Module
    CASH_VIEW: 'cash:view',
    CASH_OPEN: 'cash:open',
    CASH_CLOSE: 'cash:close',
    CASH_WITHDRAW: 'cash:withdraw',
    CASH_DEPOSIT: 'cash:deposit',

    // Reports Module
    REPORTS_VIEW: 'reports:view',
    REPORTS_EXPORT: 'reports:export',

    // Inventory Module
    INVENTORY_VIEW: 'inventory:view',
    INVENTORY_ADJUST: 'inventory:adjust',

    // Settings Module
    SETTINGS_VIEW: 'settings:view',
    SETTINGS_EDIT: 'settings:edit',

    // Users Module
    USERS_VIEW: 'users:view',
    USERS_CREATE: 'users:create',
    USERS_EDIT: 'users:edit',
    USERS_DELETE: 'users:delete',

    // Audits
    AUDITS_VIEW: 'audits:view',
};

const ROLE_PERMISSIONS = {
    admin: Object.values(PERMISSIONS), // Admin has all permissions

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
 * Check if a role has a specific permission
 */
function hasPermission(role, permission) {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) return false;
    return permissions.includes(permission);
}

/**
 * Middleware to require specific permission(s)
 */
function requirePermission(...requiredPermissions) {
    return (req, res, next) => {
        try {
            const role = req.user?.role;
            if (!role) {
                return res.status(401).json({ error: 'No autenticado', code: 'UNAUTHENTICATED' });
            }

            const userPermissions = ROLE_PERMISSIONS[role] || [];
            const hasAllPermissions = requiredPermissions.every(p => userPermissions.includes(p));

            if (!hasAllPermissions) {
                return res.status(403).json({
                    error: 'Permisos insuficientes',
                    code: 'FORBIDDEN',
                    required: requiredPermissions,
                    role
                });
            }

            next();
        } catch (e) {
            next(e);
        }
    };
}

/**
 * Legacy role-based middleware (for backwards compatibility)
 */
function requireRole(...roles) {
    return (req, res, next) => {
        try {
            const role = req.user?.role;
            if (!role || !roles.includes(role)) {
                return res.status(403).json({ error: 'Permisos insuficientes', code: 'FORBIDDEN' });
            }
            next();
        } catch (e) {
            next(e);
        }
    };
}

module.exports = {
    PERMISSIONS,
    ROLE_PERMISSIONS,
    hasPermission,
    requirePermission,
    requireRole
};
