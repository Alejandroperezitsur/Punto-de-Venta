const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('./auth');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'pos-dev-secret';

function nowISO() {
  return new Date().toISOString();
}

async function deleteSaleWithReversal(sale_id) {
  const sale = await db.get('SELECT * FROM sales WHERE id = ?', [sale_id])
  if (!sale) return false
  const items = await db.all('SELECT * FROM sale_items WHERE sale_id = ?', [sale_id])
  for (const it of items) {
    const product = await db.get('SELECT * FROM products WHERE id = ?', [it.product_id])
    if (!product) continue
    const newStock = +(product.stock + it.quantity).toFixed(3)
    await db.run('UPDATE products SET stock = ? WHERE id = ?', [newStock, it.product_id])
    await db.run('DELETE FROM inventory_movements WHERE product_id = ? AND reason = ?', [it.product_id, `Venta #${sale_id}`])
  }
  await db.run('DELETE FROM cash_movements WHERE reference = ?', [`Venta #${sale_id}`])
  await db.run('DELETE FROM sales WHERE id = ?', [sale_id])
  return true
}

router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM sales ORDER BY id DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const sale = await db.get('SELECT * FROM sales WHERE id = ?', [req.params.id]);
    if (!sale) return res.status(404).json({ error: 'No encontrado' });
    const items = await db.all('SELECT si.*, p.name AS product_name FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?', [req.params.id]);
    const payments = await db.all('SELECT p.method, p.amount, u.username FROM payments p LEFT JOIN users u ON u.id = p.user_id WHERE p.sale_id = ?', [req.params.id]);
    const customer = sale.customer_id ? await db.get('SELECT name, phone, email, rfc FROM customers WHERE id = ?', [sale.customer_id]) : null;
    res.json({ ...sale, customer_name: customer?.name || null, customer_phone: customer?.phone || null, customer_email: customer?.email || null, customer_rfc: customer?.rfc || null, items, payments });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const { customer_id = null, items = [], discount = 0, payment_method = 'cash', payments = null } = req.body;
  try {
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Items requeridos' });
    const settings = await db.all('SELECT key, value FROM settings');
    const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
    const taxRate = parseFloat(map.tax_rate || '0');

    let subtotal = 0;
    for (const it of items) {
      const product = await db.get('SELECT * FROM products WHERE id = ?', [it.product_id]);
      if (!product) return res.status(400).json({ error: `Producto ${it.product_id} no existe` });
      if (product.active !== 1) return res.status(400).json({ error: `Producto inactivo` });
      if (product.stock < it.quantity) return res.status(400).json({ error: `Stock insuficiente para ${product.name}` });
      const unit_price = it.unit_price ?? product.price;
      subtotal += unit_price * it.quantity;
    }
    const tax = +(subtotal * taxRate).toFixed(2);
    const discountVal = +((typeof discount === 'number' ? discount : 0)).toFixed(2);
    const total = +(subtotal + tax - discountVal).toFixed(2);

    const created_at = nowISO();
    const saleRes = await db.run(
      'INSERT INTO sales (customer_id, subtotal, tax, discount, total, payment_method, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [customer_id, subtotal, tax, discountVal, total, payment_method, created_at]
    );
    const sale_id = saleRes.id;

    for (const it of items) {
      const product = await db.get('SELECT * FROM products WHERE id = ?', [it.product_id]);
      const unit_price = it.unit_price ?? product.price;
      const line_total = +(unit_price * it.quantity).toFixed(2);
      await db.run(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?)',
        [sale_id, it.product_id, it.quantity, unit_price, line_total]
      );
      const newStock = +(product.stock - it.quantity).toFixed(3);
      await db.run('UPDATE products SET stock = ? WHERE id = ?', [newStock, it.product_id]);
      await db.run('INSERT INTO inventory_movements (product_id, change, reason, created_at) VALUES (?, ?, ?, ?)', [it.product_id, -it.quantity, `Venta #${sale_id}`, created_at]);
    }

    const sale = await db.get('SELECT * FROM sales WHERE id = ?', [sale_id]);
    const saleItems = await db.all('SELECT * FROM sale_items WHERE sale_id = ?', [sale_id]);
    const payList = Array.isArray(payments) && payments.length ? payments : [{ method: payment_method, amount: total }];
    let userId = null;
    try {
      const h = req.headers.authorization || '';
      const m = h.match(/^Bearer\s+(.*)$/);
      if (m) { const payload = jwt.verify(m[1], JWT_SECRET); userId = payload.uid }
    } catch {}
    for (const p of payList) {
      await db.run('INSERT INTO payments (sale_id, method, amount, created_at, user_id) VALUES (?, ?, ?, ?, ?)', [sale_id, p.method, p.amount, created_at, userId]);
    }
    if (payList.some(p => p.method === 'credit')) {
      if (!customer_id) return res.status(400).json({ error: 'Crédito requiere cliente' });
      await db.run('INSERT INTO receivables (customer_id, sale_id, amount_due, status, created_at) VALUES (?, ?, ?, ?, ?)', [customer_id, sale_id, total, 'open', created_at]);
    }
    // cash movement if cash session open for the user (optional)
    try {
      const session = db.get('SELECT * FROM cash_sessions WHERE closed_at IS NULL ORDER BY id DESC LIMIT 1');
      const cashAmount = payList.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
      if (session && cashAmount > 0) {
        await db.run('INSERT INTO cash_movements (session_id, type, reference, amount, created_at) VALUES (?, ?, ?, ?, ?)', [session.id, 'sale', `Venta #${sale_id}`, cashAmount, created_at]);
      }
    } catch {}
    const customer = sale.customer_id ? await db.get('SELECT name, phone, email, rfc FROM customers WHERE id = ?', [sale.customer_id]) : null;
    res.status(201).json({ ...sale, customer_name: customer?.name || null, customer_phone: customer?.phone || null, customer_email: customer?.email || null, customer_rfc: customer?.rfc || null, items: saleItems });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const sale_id = +req.params.id
    const ok = await deleteSaleWithReversal(sale_id)
    if (!ok) return res.status(404).json({ error: 'No encontrado' })
    res.json({ ok })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

router.post('/reset-demo', async (req, res) => {
  try {
    const s = await db.all('SELECT key, value FROM settings')
    const map = Object.fromEntries(s.map(r => [r.key, r.value]))
    let ids = []
    try {
      const parsed = JSON.parse(map.demo_sales || '[]')
      if (Array.isArray(parsed)) ids = parsed
      else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.ids)) ids = parsed.ids
    } catch {}
    let count = 0
    for (const id of ids) {
      const ok = await deleteSaleWithReversal(+id)
      if (ok) count++
    }
    await db.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', ['demo_sales', JSON.stringify({ ids: [], labels: [] })])
    res.json({ ok: true, deleted: count, ids })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

module.exports = router;
