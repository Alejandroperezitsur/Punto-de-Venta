const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const { auth } = require('./auth');

// Predictions
router.get('/inventory', auth, async (req, res) => {
    try {
        const predictions = await aiService.predictInventory(req.user.storeId);
        res.jsonResponse(predictions);
    } catch (e) {
        res.jsonError(e.message);
    }
});

// Recommendations
router.get('/recommendations/:productId', auth, async (req, res) => {
    try {
        const recs = await aiService.getRecommendations(req.user.storeId, req.params.productId);
        res.jsonResponse(recs);
    } catch (e) {
        res.jsonError(e.message);
    }
});

// Assistant Chat
router.post('/assistant', auth, async (req, res) => {
    const { query } = req.body;
    try {
        const response = await aiService.getAssistantResponse(req.user.storeId, query);
        res.jsonResponse({ response });
    } catch (e) {
        res.jsonError(e.message);
    }
});

// Insights
router.get('/insights', auth, async (req, res) => {
    try {
        const insights = await aiService.generateDailyInsights(req.user.storeId);
        res.jsonResponse(insights);
    } catch (e) {
        res.jsonError(e.message);
    }
});

module.exports = router;
