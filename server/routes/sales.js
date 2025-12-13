const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { auth, optionalAuth } = require('./auth');
const { createSale, deleteSaleWithReversal } = require('../services/salesService');

router.get('/', auth, async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      where: { store_id: req.user.storeId },
      orderBy: { id: 'desc' },
      include: { customer: true }
    });

    // Format to match frontend expectations if necessary
    const formatted = sales.map(s => ({
      ...s,
      customer_name: s.customer?.name
    }));

    res.jsonResponse(formatted);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener ventas', 500);
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const sale = await prisma.sale.findFirst({
      where: { id, store_id: req.user.storeId },
      include: {
        items: {
          include: { product: true }
        },
        payments: {
          include: { user: true }
        },
        customer: true
      }
    });

    if (!sale) return res.jsonError('No encontrado', 404);

    // Format legacy response structure
    const response = {
      ...sale,
      customer_name: sale.customer?.name || null,
      customer_phone: sale.customer?.phone || null,
      customer_email: sale.customer?.email || null,
      customer_rfc: sale.customer?.rfc || null,
      items: sale.items.map(i => ({
        ...i,
        product_name: i.product?.name
      })),
      payments: sale.payments.map(p => ({
        method: p.method,
        amount: p.amount,
        username: p.user?.username
      }))
    };

    res.jsonResponse(response);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener venta', 500);
  }
});

router.post('/', auth, async (req, res, next) => {
  const { customer_id = null, items = [], discount = 0, payment_method = 'cash', payments = null } = req.body;
  try {
    const userId = req.user.uid;
    const storeId = req.user.storeId;

    const result = await createSale({
      customer_id,
      items,
      discount,
      payment_method,
      payments,
      userId,
      storeId
    });

    res.jsonResponse(result, { status: 201 });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const sale_id = parseInt(req.params.id);
    const ok = await deleteSaleWithReversal(sale_id, req.user.uid, req.user.storeId);
    if (!ok) return res.jsonError('No encontrado o no pertenece a esta tienda', 404);
    res.jsonResponse({ ok });
  } catch (e) {
    res.jsonError(e.message, 400);
  }
});

router.post('/reset-demo', auth, async (req, res) => {
  // Only Admin can reset demo
  if (req.user.role !== 'admin') return res.jsonError('No autorizado', 403);

  try {
    const setting = await prisma.storeSetting.findUnique({
      where: { store_id_key: { store_id: req.user.storeId, key: 'demo_sales' } }
    });

    let ids = [];
    try {
      const parsed = JSON.parse(setting?.value || '[]');
      if (Array.isArray(parsed)) ids = parsed;
      else if (parsed.ids) ids = parsed.ids;
    } catch { }

    let count = 0;
    for (const id of ids) {
      const ok = await deleteSaleWithReversal(parseInt(id), req.user.uid, req.user.storeId);
      if (ok) count++;
    }

    await prisma.storeSetting.upsert({
      where: { store_id_key: { store_id: req.user.storeId, key: 'demo_sales' } },
      update: { value: JSON.stringify({ ids: [], labels: [] }) },
      create: { store_id: req.user.storeId, key: 'demo_sales', value: JSON.stringify({ ids: [], labels: [] }) }
    });

    res.jsonResponse({ ok: true, deleted: count, ids });
  } catch (e) {
    console.error(e);
    res.jsonError('Error al resetear demo', 500);
  }
});

module.exports = router;
