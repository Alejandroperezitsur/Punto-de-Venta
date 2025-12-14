const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { optionalAuth, auth } = require('./auth');

// Submit Feedback
router.post('/', optionalAuth, async (req, res) => {
    const { type, comment, rating, url } = req.body;

    if (!comment) return res.jsonError('Comentario requerido', 400);

    try {
        const feedback = await prisma.userFeedback.create({
            data: {
                user_id: req.user ? req.user.uid : null,
                type: type || 'other',
                comment,
                rating: rating ? parseInt(rating) : null,
                url
            }
        });
        res.jsonResponse(feedback);
    } catch (e) {
        res.jsonError('Error enviando feedback');
    }
});

// List Feedback (Admin)
router.get('/', auth, async (req, res) => {
    if (req.user.role !== 'admin' && !req.user.is_super_admin) return res.jsonError('No autorizado', 403);

    try {
        const list = await prisma.userFeedback.findMany({
            orderBy: { created_at: 'desc' },
            take: 50
        });
        res.jsonResponse(list);
    } catch (e) {
        res.jsonError(e.message);
    }
});

module.exports = router;
