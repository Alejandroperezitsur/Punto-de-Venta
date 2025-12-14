const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { auth } = require('./auth');

// List Tickets
router.get('/', auth, async (req, res) => {
    try {
        const tickets = await prisma.supportTicket.findMany({
            where: { store_id: req.user.storeId },
            include: { messages: true },
            orderBy: { updated_at: 'desc' }
        });
        res.jsonResponse(tickets);
    } catch (e) {
        res.jsonError(e.message);
    }
});

// Create Ticket
router.post('/', auth, async (req, res) => {
    const { subject, message, priority } = req.body;
    try {
        const ticket = await prisma.supportTicket.create({
            data: {
                store_id: req.user.storeId,
                user_id: req.user.uid,
                subject,
                message,
                priority: priority || 'normal',
                messages: {
                    create: {
                        message,
                        user_id: req.user.uid
                    }
                }
            }
        });
        res.jsonResponse(ticket);
    } catch (e) {
        res.jsonError('Error creando ticket');
    }
});

// Add Reply
router.post('/:id/reply', auth, async (req, res) => {
    const { message } = req.body;
    const ticketId = parseInt(req.params.id);

    try {
        // Verify ownership
        const ticket = await prisma.supportTicket.findFirst({
            where: { id: ticketId, store_id: req.user.storeId }
        });
        if (!ticket) return res.jsonError('Ticket no encontrado', 404);

        const reply = await prisma.ticketMessage.create({
            data: {
                ticket_id: ticketId,
                user_id: req.user.uid,
                message,
                is_staff: false
            }
        });

        // Update ticket timestamp
        await prisma.supportTicket.update({
            where: { id: ticketId },
            data: { status: 'open' } // Re-open if closed?
        });

        res.jsonResponse(reply);
    } catch (e) {
        res.jsonError(e.message);
    }
});

module.exports = router;
