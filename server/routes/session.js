const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { auth, requireSuperAdmin } = require('./auth');

router.get('/', auth, async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { store_id: req.user.storeId },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    res.jsonResponse(sessions.map(s => ({
      id: s.id,
      userId: s.user_id,
      jti: s.jti,
      deviceFingerprint: s.device_fingerprint,
      ipAddress: s.ip_address,
      createdAt: s.created_at,
      lastActivity: s.last_activity,
      revoked: s.revoked,
    })));
  } catch (e) {
    res.jsonError('Error al obtener sesiones', 500);
  }
});

router.delete('/:jti', auth, async (req, res) => {
  try {
    const session = await prisma.session.findUnique({ where: { jti: req.params.jti } });
    if (!session) return res.jsonError('Sesión no encontrada', 404);

    const isOwn = session.user_id === req.user.uid;
    const isAdmin = req.user.role === 'admin' || req.user.is_super_admin;
    if (!isOwn && !isAdmin) {
      return res.jsonError('No tienes permiso para revocar esta sesión', 403);
    }

    await prisma.session.update({
      where: { jti: req.params.jti },
      data: { revoked: true },
    });

    res.jsonResponse({ ok: true });
  } catch (e) {
    res.jsonError('Error al revocar sesión', 500);
  }
});

router.post('/validate', auth, async (req, res) => {
  try {
    const session = await prisma.session.findUnique({ where: { jti: req.user.jti } });
    if (!session || session.revoked) {
      return res.jsonError('Sesión revocada', 401);
    }
    if (session.device_fingerprint && req.headers['x-device-fingerprint']) {
      if (session.device_fingerprint !== req.headers['x-device-fingerprint']) {
        return res.jsonError('Fingerprint no coincide', 401);
      }
    }
    await prisma.session.update({
      where: { jti: req.user.jti },
      data: { last_activity: new Date() },
    });
    res.jsonResponse({ valid: true });
  } catch (e) {
    res.jsonError('Error al validar sesión', 500);
  }
});

module.exports = router;
