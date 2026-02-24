const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { auth } = require('./auth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');

function parseRange(q) {
  const from = q.from ? new Date(q.from) : new Date(0); // 1970
  const to = q.to ? new Date(q.to) : new Date();
  return { from, to };
}

router.get('/summary', auth, requirePermission(PERMISSIONS.REPORTS_VIEW), async (req, res) => {
  try {
    const { from, to } = parseRange(req.query);
    const agg = await prisma.sale.aggregate({
      _count: { id: true },
      _sum: { total: true },
      where: {
        store_id: req.user.storeId,
        created_at: {
          gte: from,
          lte: to
        }
      }
    });

    res.jsonResponse({
      count: agg._count.id,
      total: agg._sum.total || 0
    });
  } catch (e) {
    console.error(e);
    res.jsonError('Error en reporte resumen', 500);
  }
});

router.get('/products', auth, requirePermission(PERMISSIONS.REPORTS_VIEW), async (req, res) => {
  try {
    const { from, to } = parseRange(req.query);

    // Complex aggregation with join, using raw query for performance and simplicity in migration
    // Prisma doesn't strictly support relation aggregation in simple queries easily without fetching data.
    const rows = await prisma.$queryRaw`
        SELECT 
            si.product_id, 
            p.name, 
            SUM(si.quantity) AS qty, 
            SUM(si.line_total) AS total
        FROM sale_items si 
        JOIN sales s ON si.sale_id = s.id 
        JOIN products p ON si.product_id = p.id
        WHERE s.store_id = ${req.user.storeId} 
          AND s.created_at BETWEEN ${from} AND ${to}
        GROUP BY si.product_id 
        ORDER BY total DESC
    `;

    // Convert BigInt to Number if necessary (Prisma returns BigInt for SUM sometimes)
    const formatted = rows.map(r => ({
      ...r,
      qty: Number(r.qty),
      total: Number(r.total)
    }));

    res.jsonResponse(formatted);
  } catch (e) {
    console.error(e);
    res.jsonError('Error en reporte productos', 500);
  }
});

router.get('/customers', auth, requirePermission(PERMISSIONS.REPORTS_VIEW), async (req, res) => {
  try {
    const { from, to } = parseRange(req.query);
    // Left join manually
    const rows = await prisma.$queryRaw`
        SELECT 
            s.customer_id, 
            c.name, 
            COUNT(s.id) AS count, 
            SUM(s.total) AS total
        FROM sales s 
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE s.store_id = ${req.user.storeId}
          AND s.created_at BETWEEN ${from} AND ${to}
        GROUP BY s.customer_id 
        ORDER BY total DESC
    `;

    const formatted = rows.map(r => ({
      ...r,
      count: Number(r.count),
      total: Number(r.total)
    }));

    res.jsonResponse(formatted);
  } catch (e) {
    console.error(e);
    res.jsonError('Error en reporte clientes', 500);
  }
});

router.get('/demo-summary', auth, requirePermission(PERMISSIONS.REPORTS_VIEW), async (req, res) => {
  try {
    const { from, to } = parseRange(req.query);
    const setting = await prisma.storeSetting.findUnique({
      where: { store_id_key: { store_id: req.user.storeId, key: 'demo_sales' } }
    });

    let ids = [];
    try {
      const parsed = JSON.parse(setting?.value || '[]');
      if (Array.isArray(parsed)) ids = parsed;
      else if (parsed.ids) ids = parsed.ids;
    } catch { }

    // Convert string IDs to int if needed, ensuring safety
    const safeIds = ids.map(id => parseInt(id)).filter(n => !isNaN(n));

    let demo = { count: 0, total: 0 };
    let real = { count: 0, total: 0 };

    if (safeIds.length > 0) {
      const demoAgg = await prisma.sale.aggregate({
        _count: { id: true },
        _sum: { total: true },
        where: {
          store_id: req.user.storeId,
          id: { in: safeIds },
          created_at: { gte: from, lte: to }
        }
      });
      demo.count = demoAgg._count.id;
      demo.total = demoAgg._sum.total || 0;

      const realAgg = await prisma.sale.aggregate({
        _count: { id: true },
        _sum: { total: true },
        where: {
          store_id: req.user.storeId,
          id: { notIn: safeIds },
          created_at: { gte: from, lte: to }
        }
      });
      real.count = realAgg._count.id;
      real.total = realAgg._sum.total || 0;
    } else {
      const realAgg = await prisma.sale.aggregate({
        _count: { id: true },
        _sum: { total: true },
        where: {
          store_id: req.user.storeId,
          created_at: { gte: from, lte: to }
        }
      });
      real.count = realAgg._count.id;
      real.total = realAgg._sum.total || 0;
    }

    res.jsonResponse({ demo, real });
  } catch (e) {
    console.error(e);
    res.jsonError('Error en reporte demo', 500);
  }
});

module.exports = router;
