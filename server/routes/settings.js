const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { auth } = require('./auth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');

router.get('/', auth, requirePermission(PERMISSIONS.SETTINGS_VIEW), async (req, res) => {
  try {
    const rows = await prisma.storeSetting.findMany({
      where: { store_id: req.user.storeId }
    });
    const out = {};
    for (const r of rows) out[r.key] = r.value;
    res.jsonResponse(out);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener configuración', 500);
  }
});

router.put('/', auth, requirePermission(PERMISSIONS.SETTINGS_EDIT), async (req, res) => {
  const updates = req.body || {};
  try {
    // Check permission? Assuming auth middleware handles role check if needed, 
    // but usually settings are admin only.
    const transaction = [];
    for (const [key, value] of Object.entries(updates)) {
      transaction.push(
        prisma.storeSetting.upsert({
          where: { store_id_key: { store_id: req.user.storeId, key } },
          update: { value: String(value) },
          create: { store_id: req.user.storeId, key, value: String(value) }
        })
      );
    }

    await prisma.$transaction(transaction);

    const rows = await prisma.storeSetting.findMany({
      where: { store_id: req.user.storeId }
    });
    const out = {};
    for (const r of rows) out[r.key] = r.value;
    res.jsonResponse(out);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al guardar configuración', 500);
  }
});

module.exports = router;
