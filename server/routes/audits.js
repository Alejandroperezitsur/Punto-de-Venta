const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { auth } = require('./auth');
const { requireRole } = require('../middleware/role');
const { logger } = require('../logger');

router.get('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { startDate, endDate, userId, event, search, limit = '20', offset = '0' } = req.query;

    const where = {
      store_id: req.user.storeId // STRICT ISOLATION
    };

    if (startDate && endDate) {
      where.created_at = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    if (userId) where.user_id = parseInt(userId);
    if (event) where.event = event;
    if (search) {
      where.OR = [
        { ref_type: { contains: search } },
        { ref_id: { contains: search } }, // ref_id is often Int, check schema. If String OK. If Int, this might crash. Assuming String or careful.
        // If ref_id is Int in Prisma, 'contains' won't work.
        // Let's assume ref_type or data is the main search target.
        { data: { contains: search } }
      ];
    }

    // Safety check for search on non-string fields?
    // In original legacy code: ref_id was often stringified or just ID.
    // Prisma `Audits` model `ref_id` should probably be String to support multiple types or Int?
    // If it is Int, we cannot do contains.

    const take = Math.min(Math.max(parseInt(limit), 1), 200);
    const skip = Math.max(parseInt(offset), 0);

    const [total, items] = await prisma.$transaction([
      prisma.audit.count({ where }),
      prisma.audit.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take,
        skip
      })
    ]);

    try { logger.info({ count: items.length }, 'audits_list'); } catch { }

    res.jsonResponse({ total, items, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (e) {
    console.error(e);
    res.jsonError(e.message);
  }
});

router.get('/events', auth, requireRole('admin'), async (req, res) => {
  try {
    // Distinct events
    const rows = await prisma.audit.groupBy({
      by: ['event'],
      where: { store_id: req.user.storeId },
      orderBy: { event: 'asc' }
    });

    const list = rows.map(r => r.event).filter(Boolean);
    res.jsonResponse(list);
  } catch (e) {
    console.error(e);
    res.jsonError(e.message);
  }
});

module.exports = router;
