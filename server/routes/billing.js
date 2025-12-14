const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { auth } = require('./auth');

// Mock Billing Portal
router.post('/checkout', auth, async (req, res) => {
    const { planId } = req.body;

    // Simulate payment processing delay
    await new Promise(r => setTimeout(r, 1000));

    // Update or create subscription
    try {
        const sub = await prisma.subscription.upsert({
            where: { store_id: req.user.storeId },
            update: {
                plan_id: planId,
                status: 'active',
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 days
            },
            create: {
                store_id: req.user.storeId,
                plan_id: planId,
                status: 'active',
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        });

        res.jsonResponse({ success: true, subscription: sub });
    } catch (e) {
        res.jsonError('Error procesando pago');
    }
});

router.get('/current', auth, async (req, res) => {
    try {
        const sub = await prisma.subscription.findUnique({
            where: { store_id: req.user.storeId }
        });
        res.jsonResponse(sub || { status: 'free', plan_id: 'free' });
    } catch (e) {
        res.jsonError(e.message);
    }
});

module.exports = router;
