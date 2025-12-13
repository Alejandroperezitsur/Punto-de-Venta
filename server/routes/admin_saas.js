const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { auth } = require('./auth');
const bcrypt = require('bcryptjs');

// Middleware to enforce Super Admin
const requireSuperAdmin = (req, res, next) => {
    if (!req.user || !req.user.is_super_admin) {
        return res.jsonError('Requiere privilegios de Super Admin', 403);
    }
    next();
};

router.use(auth);
router.use(requireSuperAdmin);

// === DASHBOARD ===
router.get('/dashboard', async (req, res) => {
    try {
        const totalStores = await prisma.store.count();
        const totalUsers = await prisma.user.count();
        const activeStores = await prisma.store.count({ where: { active: 1 } });

        // Global Sales (Heavy query potentially)
        // Aggregating all sales might be slow in production without a materialized view or caching.
        // For now, simple aggregation.
        const salesAgg = await prisma.sale.aggregate({
            _sum: { total: true },
            _count: { id: true }
        });

        res.jsonResponse({
            stores: { total: totalStores, active: activeStores },
            users: { total: totalUsers },
            sales: { total: salesAgg._sum.total || 0, count: salesAgg._count.id || 0 }
        });
    } catch (e) {
        console.error(e);
        res.jsonError('Error al obtener dashboard', 500);
    }
});

// === STORES MANAGEMENT ===
router.get('/stores', async (req, res) => {
    try {
        const stores = await prisma.store.findMany({
            orderBy: { id: 'desc' },
            include: {
                _count: {
                    select: { users: true, sales: true }
                }
            }
        });

        const mapped = stores.map(s => ({
            id: s.id,
            name: s.name,
            active: s.active,
            created_at: s.created_at,
            users_count: s._count.users,
            sales_count: s._count.sales
        }));

        res.jsonResponse(mapped);
    } catch (e) {
        console.error(e);
        res.jsonError('Error al listar tiendas', 500);
    }
});

router.post('/stores', async (req, res) => {
    const { name, admin_username, admin_password } = req.body;
    if (!name || !admin_username || !admin_password) return res.jsonError('Faltan datos requeridos', 400);

    try {
        await prisma.$transaction(async (tx) => {
            // Create Store
            const store = await tx.store.create({
                data: { name, active: 1 }
            });

            // Find or Create User
            let user = await tx.user.findUnique({ where: { username: admin_username } });

            if (!user) {
                const hash = await bcrypt.hash(admin_password, 10);
                user = await tx.user.create({
                    data: {
                        username: admin_username,
                        password_hash: hash,
                        active: 1
                    }
                });
            }

            // Link User as Admin
            await tx.userStore.create({
                data: {
                    user_id: user.id,
                    store_id: store.id,
                    role: 'admin'
                }
            });

            // Create Default Category? Maybe not needed.
        });

        res.jsonResponse({ ok: true });
    } catch (e) {
        console.error(e);
        res.jsonError('Error al crear tienda', 500);
    }
});

router.put('/stores/:id', async (req, res) => {
    const { active, name } = req.body;
    const id = parseInt(req.params.id);

    try {
        const update = {};
        if (active !== undefined) update.active = active ? 1 : 0;
        if (name) update.name = name;

        const store = await prisma.store.update({
            where: { id },
            data: update
        });
        res.jsonResponse(store);
    } catch (e) {
        console.error(e);
        res.jsonError('Error al actualizar tienda', 500);
    }
});

// === GLOBAL USERS ===
router.get('/users', async (req, res) => {
    // List all users globally
    try {
        const users = await prisma.user.findMany({
            take: 100,
            orderBy: { id: 'desc' },
            include: {
                _count: { select: { stores: true } }
            }
        });
        res.jsonResponse(users);
    } catch (e) {
        console.error(e);
        res.jsonError('Error al listar usuarios', 500);
    }
});

module.exports = router;
