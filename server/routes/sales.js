const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, optionalAuth } = require('./auth');
const { createSale, deleteSaleWithReversal } = require('../services/salesService');

router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM sales ORDER BY id DESC');
    res.jsonResponse(rows);
  } catch (e) {
    res.jsonError(e.message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const sale = await db.get('SELECT * FROM sales WHERE id = ?', [req.params.id]);
    if (!sale) return res.jsonError('No encontrado', 404);
    const items = await db.all('SELECT si.*, p.name AS product_name FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?', [req.params.id]);
    const payments = await db.all('SELECT p.method, p.amount, u.username FROM payments p LEFT JOIN users u ON u.id = p.user_id WHERE p.sale_id = ?', [req.params.id]);
    const customer = sale.customer_id ? await db.get('SELECT name, phone, email, rfc FROM customers WHERE id = ?', [sale.customer_id]) : null;
    res.jsonResponse({ ...sale, customer_name: customer?.name || null, customer_phone: customer?.phone || null, customer_email: customer?.email || null, customer_rfc: customer?.rfc || null, items, payments });
  } catch (e) {
    res.jsonError(e.message);
  }
});

router.post('/', optionalAuth, async (req, res, next) => {
  const { customer_id = null, items = [], discount = 0, payment_method = 'cash', payments = null } = req.body;
  try {
    const userId = req.user?.uid || null;
    const result = await createSale({ customer_id, items, discount, payment_method, payments, userId });
    res.jsonResponse(result, { status: 201 });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const sale_id = +req.params.id;
    const ok = await deleteSaleWithReversal(sale_id, req.user.uid);
    if (!ok) return res.jsonError('No encontrado', 404);
    res.jsonResponse({ ok });
  } catch (e) {
    res.jsonError(e.message, 400);
  }
});

router.post('/reset-demo', async (req, res) => {
  try {
    const s = await db.all('SELECT key, value FROM settings');
    const map = Object.fromEntries(s.map(r => [r.key, r.value]));
    let ids = [];
    try {
      const parsed = JSON.parse(map.demo_sales || '[]');
      if (Array.isArray(parsed)) ids = parsed;
      else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.ids)) ids = parsed.ids;
    } catch { }
    let count = 0;
    for (const id of ids) {
      const ok = await deleteSaleWithReversal(+id);
      if (ok) count++;
    }
    await db.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', ['demo_sales', JSON.stringify({ ids: [], labels: [] })]);
    res.jsonResponse({ ok: true, deleted: count, ids });
  } catch (e) {
    res.jsonError(e.message, 400);
  }
});

module.exports = router;
