const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { auth, optionalAuth, requireSuperAdmin } = require('./auth');

// Track Event
router.post('/event', optionalAuth, async (req, res) => {
    const { type, data } = req.body;
    try {
        await prisma.productEvent.create({
            data: {
                type,
                user_id: req.user ? req.user.uid : null,
                store_id: req.user ? req.user.storeId : null,
                data: data ? JSON.stringify(data) : null
            }
        });
        res.json({ ok: true });
    } catch (e) {
        // Analytics failures should not block the client
        console.error('Analytics Error:', e.message);
        res.status(200).json({ ok: false, ignored: true });
    }
});

// Admin Stats
router.get('/stats', auth, requireSuperAdmin, async (req, res) => {
    try {
        const [users, stores, sales, errors] = await Promise.all([
            prisma.user.count(),
            prisma.store.count(),
            prisma.sale.count(),
            prisma.productEvent.count({ where: { type: 'client_error' } })
        ]);

        const recentEvents = await prisma.productEvent.findMany({
            take: 20,
            orderBy: { created_at: 'desc' }
        });

        res.jsonResponse({
            kpis: {
                totalUsers: users,
                totalStores: stores,
                totalSales: sales,
                totalErrors: errors
            },
            recentEvents
        });
    } catch (e) {
        res.jsonError(e.message);
    }
});

module.exports = router;
