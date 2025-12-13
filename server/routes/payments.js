const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { auth } = require('./auth');
const { v4: uuidv4 } = require('uuid');

// Mock Gateway Service (Internal Helper)
const gateway = {
    async createPaymentIntent(amount, currency = 'mxn') {
        // Simulate API call to Stripe/MercadoPago
        await new Promise(r => setTimeout(r, 600));
        return {
            id: `pi_${uuidv4().substring(0, 18)}`,
            client_secret: `secret_${uuidv4()}`,
            amount,
            currency,
            status: 'requires_payment_method'
        };
    },
    async confirmPayment(paymentId) {
        await new Promise(r => setTimeout(r, 800));
        return { status: 'succeeded', id: paymentId };
    }
};

// Create a Payment Intent (for online checkout)
router.post('/create-intent', auth, async (req, res) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.jsonError('Monto inválido', 400);

    try {
        const intent = await gateway.createPaymentIntent(amount);
        res.jsonResponse(intent);
    } catch (e) {
        res.jsonError('Error creating payment intent', 500);
    }
});

// Webhook / Callback (Simulated)
// In a real app, this would be validated with headers from Stripe
router.post('/webhook', async (req, res) => {
    const { type, data } = req.body;
    // Handle 'payment_intent.succeeded', etc.
    // For this mock, we assume simple direct confirmation call
    console.log('Webhook Received:', type, data);
    res.json({ received: true });
});

// Manual Confirm (for frontend simulation)
router.post('/confirm', auth, async (req, res) => {
    const { paymentId, saleId } = req.body;
    try {
        const result = await gateway.confirmPayment(paymentId);
        if (result.status === 'succeeded') {
            // Update Payment in DB if it was pending... 
            // In POS, usually we create Sale + Payment transactionally.
            // If paying "Online" for a saved sale?
            // The flow: Sale created -> Pending Payment -> Gateway success -> Update Payment Status

            // For now, simpler: Return success to frontend, frontend calls createSale with 'card_online'.
            res.jsonResponse({ success: true, paymentId });
        } else {
            res.jsonError('Pago fallido', 400);
        }
    } catch (e) {
        res.jsonError('Error confirmando pago', 500);
    }
});

module.exports = router;
