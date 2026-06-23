const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { auth, attachTokenRotation } = require('./auth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');
const { evaluateSaleRisk } = require('../services/fraudDetectionService');
router.use(attachTokenRotation);

// GET /api/fraud/alerts — list fraud alerts
router.get('/alerts', auth, requirePermission(PERMISSIONS.REPORTS_VIEW), async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const severity = req.query.severity;
    const acknowledged = req.query.acknowledged === 'true';

    const where = { store_id: storeId };
    if (severity) where.severity = severity;
    if (acknowledged) where.acknowledged_at = { not: null };
    else if (req.query.acknowledged === 'false') where.acknowledged_at = null;

    const alerts = await prisma.fraudAlert.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    res.jsonResponse({
      data: alerts.map((a) => ({
        id: a.id,
        score: a.score,
        severity: a.severity,
        heuristics: JSON.parse(a.heuristics || '[]'),
        details: a.details,
        acknowledged: !!a.acknowledged_at,
        acknowledged_by: a.acknowledged_by,
        created_at: a.created_at,
      })),
    });
  } catch (e) {
    res.jsonError('Error fetching fraud alerts', 500);
  }
});

// POST /api/fraud/alerts/:id/acknowledge
router.post('/alerts/:id/acknowledge', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.fraudAlert.update({
      where: { id },
      data: {
        acknowledged_by: req.user.uid,
        acknowledged_at: new Date(),
      },
    });
    res.jsonResponse({ ok: true });
  } catch (e) {
    res.jsonError('Error acknowledging alert', 500);
  }
});

// POST /api/fraud/evaluate — evaluate a sale for fraud risk
router.post('/evaluate', auth, async (req, res) => {
  try {
    const risk = await evaluateSaleRisk(req.user.uid, req.user.storeId, req.body);
    res.jsonResponse(risk);
  } catch (e) {
    res.jsonError('Error evaluating risk', 500);
  }
});

// GET /api/fraud/dashboard — dashboard anomaly metrics
router.get('/dashboard', auth, requirePermission(PERMISSIONS.REPORTS_VIEW), async (req, res) => {
  try {
    const storeId = req.user.storeId;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const totalAlerts = await prisma.fraudAlert.count({
      where: { store_id: storeId },
    });

    const todayAlerts = await prisma.fraudAlert.count({
      where: {
        store_id: storeId,
        created_at: { gte: todayStart },
      },
    });

    const criticalAlerts = await prisma.fraudAlert.count({
      where: { store_id: storeId, severity: 'critical' },
    });

    const recentAlerts = await prisma.fraudAlert.findMany({
      where: { store_id: storeId },
      orderBy: { created_at: 'desc' },
      take: 20,
      select: {
        id: true,
        score: true,
        severity: true,
        heuristics: true,
        created_at: true,
        acknowledged_at: true,
      },
    });

    res.jsonResponse({
      totalAlerts,
      todayAlerts,
      criticalAlerts,
      recentAlerts: recentAlerts.map((a) => ({
        ...a,
        heuristics: JSON.parse(a.heuristics || '[]'),
      })),
      scoreDistribution: {
        low: await prisma.fraudAlert.count({ where: { store_id: storeId, severity: 'low' } }),
        medium: await prisma.fraudAlert.count({ where: { store_id: storeId, severity: 'medium' } }),
        high: await prisma.fraudAlert.count({ where: { store_id: storeId, severity: 'high' } }),
        critical: await prisma.fraudAlert.count({ where: { store_id: storeId, severity: 'critical' } }),
      },
    });
  } catch (e) {
    res.jsonError('Error fetching dashboard', 500);
  }
});

module.exports = router;
