const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { auth } = require('./auth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');
const { createSale, deleteSaleWithReversal } = require('../services/salesService');
const { idempotency } = require('../middleware/idempotency');
const { fraudInterceptor } = require('../middleware/fraudInterceptor');
const { saleRules } = require('../validators/salesValidator');
const { validationResult } = require('express-validator');

// Pagination defaults
const PAGE_SIZE = 50;

router.get('/', auth, requirePermission(PERMISSIONS.SALES_VIEW), async (req, res) => {
  try {
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : undefined;
    const take = Math.min(parseInt(req.query.take) || PAGE_SIZE, 200);

    const sales = await prisma.sale.findMany({
      where: { store_id: req.user.storeId },
      orderBy: { id: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { customer: true }
    });

    const hasMore = sales.length > take;
    const nextCursor = hasMore ? sales[sales.length - 1].id : null;
    const data = hasMore ? sales.slice(0, take) : sales;

    const formatted = data.map(s => ({
      ...s,
      customer_name: s.customer?.name,
      total: Number(s.total),
      subtotal: Number(s.subtotal),
      tax: Number(s.tax),
      discount: Number(s.discount)
    }));

    res.jsonResponse({
      data: formatted,
      pagination: {
        nextCursor,
        hasMore,
        total: await prisma.sale.count({ where: { store_id: req.user.storeId } })
      }
    });
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener ventas', 500);
  }
});

router.get('/:id', auth, requirePermission(PERMISSIONS.SALES_VIEW), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.jsonError('ID inválido', 400);

    const sale = await prisma.sale.findFirst({
      where: { id, store_id: req.user.storeId },
      include: {
        items: { include: { product: true } },
        payments: { include: { user: true } },
        customer: true
      }
    });

    if (!sale) return res.jsonError('No encontrado', 404);

    const response = {
      ...sale,
      customer_name: sale.customer?.name || null,
      customer_phone: sale.customer?.phone || null,
      customer_email: sale.customer?.email || null,
      customer_rfc: sale.customer?.rfc || null,
      total: Number(sale.total),
      subtotal: Number(sale.subtotal),
      tax: Number(sale.tax),
      discount: Number(sale.discount),
      items: sale.items.map(i => ({
        ...i,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        line_total: Number(i.line_total),
        product_name: i.product?.name || i.product_name
      })),
      payments: sale.payments.map(p => ({
        method: p.method,
        amount: Number(p.amount),
        username: p.user?.username
      }))
    };

    res.jsonResponse(response);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener venta', 500);
  }
});

router.post('/', auth, requirePermission(PERMISSIONS.SALES_CREATE), fraudInterceptor, saleRules, idempotency, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ data: null, error: { message: 'Validación fallida', code: 'VALIDATION_ERROR', details: errors.array() } });
  }

  const { customer_id = null, items = [], discount = 0, payment_method = 'cash', payments = null } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.jsonError('Se requiere al menos un producto', 400);
  }

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
      storeId,
      idempotencyKey: req.idempotencyKey || null
    });

    res.jsonResponse(result, { status: 201 });
  } catch (e) {
    if (e.status === 409) return res.jsonError(e.message, 409);
    if (e.status === 400) return res.jsonError(e.message, 400);
    next(e);
  }
});

router.delete('/:id', auth, requirePermission(PERMISSIONS.SALES_DELETE), async (req, res) => {
  try {
    const sale_id = parseInt(req.params.id);
    if (isNaN(sale_id)) return res.jsonError('ID inválido', 400);

    const ok = await deleteSaleWithReversal(sale_id, req.user.uid, req.user.storeId);
    if (!ok) return res.jsonError('No encontrado o no pertenece a esta tienda', 404);
    res.jsonResponse({ ok });
  } catch (e) {
    res.jsonError(e.message, 400);
  }
});

router.post('/reset-demo', auth, requirePermission(PERMISSIONS.SALES_DELETE), async (req, res) => {
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
