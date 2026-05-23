const prisma = require('../db');

const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000;

async function idempotency(req, res, next) {
  const key = req.headers['x-idempotency-key'];
  if (!key) return next();

  try {
    const existing = await prisma.sale.findUnique({
      where: { idempotency_key: key },
      select: { id: true, total: true, created_at: true }
    });

    if (existing) {
      return res.jsonResponse({
        id: existing.id,
        total: existing.total,
        created_at: existing.created_at,
        idempotent: true
      }, { status: 200 });
    }

    const keyCreated = await prisma.idempotencyKey.create({
      data: {
        key,
        store_id: req.user?.storeId || 0,
        created_at: new Date()
      }
    }).catch(() => null);

    req.idempotencyKey = key;
    next();
  } catch (e) {
    next(e);
  }
}

module.exports = { idempotency };
