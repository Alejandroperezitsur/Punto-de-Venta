const express = require('express');
const router = express.Router();
const prisma = require('../db');

// Get Roadmap
router.get('/', async (req, res) => {
    try {
        const features = await prisma.featureVote.findMany({
            orderBy: [{ status: 'asc' }, { votes: 'desc' }] // status priority, then votes
        });

        // Use seed data if empty
        if (features.length === 0) {
            const seed = [
                { feature_name: 'App Móvil iOS', description: 'App nativa para iPhone/iPad', status: 'planned', votes: 120 },
                { feature_name: 'Integración Shopify', description: 'Sincronizar inventario con Shopify', status: 'planned', votes: 85 },
                { feature_name: 'Facturación Recurrente', description: 'Automatizar facturas mensuales', status: 'in_progress', votes: 200 },
                { feature_name: 'Modo Oscuro', description: 'Interfaz dark mode completa', status: 'completed', votes: 350 }
            ];
            // Don't auto-seed in GET strictly, but returning seed for now if DB empty logic
            return res.jsonResponse(seed);
        }

        res.jsonResponse(features);
    } catch (e) {
        res.jsonError(e.message);
    }
});

// Vote
router.post('/vote', async (req, res) => {
    const { feature_name } = req.body;
    try {
        const feature = await prisma.featureVote.upsert({
            where: { feature_name },
            update: { votes: { increment: 1 } },
            create: { feature_name, votes: 1, status: 'planned' }
        });
        res.jsonResponse(feature);
    } catch (e) {
        res.jsonError('Error al votar');
    }
});

module.exports = router;
