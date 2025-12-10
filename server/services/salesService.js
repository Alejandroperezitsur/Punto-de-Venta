const db = require('../db');

function nowISO() { return new Date().toISOString(); }

async function deleteSaleWithReversal(sale_id, userId = null) {
  const sale = await db.get('SELECT * FROM sales WHERE id = ?', [sale_id]);
  if (!sale) return false;
  const items = await db.all('SELECT * FROM sale_items WHERE sale_id = ?', [sale_id]);
  for (const it of items) {
    const product = await db.get('SELECT * FROM products WHERE id = ?', [it.product_id]);
    if (!product) continue;
    const newStock = +(product.stock + it.quantity).toFixed(3);
    await db.run('UPDATE products SET stock = ? WHERE id = ?', [newStock, it.product_id]);
    await db.run('DELETE FROM inventory_movements WHERE product_id = ? AND reason = ?', [it.product_id, `Venta #${sale_id}`]);
  }
  await db.run('DELETE FROM cash_movements WHERE reference = ?', [`Venta #${sale_id}`]);
  await db.run('DELETE FROM sales WHERE id = ?', [sale_id]);
  try { db.audit('sale_reverse', userId, 'sale', sale_id, null); } catch {}
  return true;
}

async function createSale({ customer_id = null, items = [], discount = 0, payment_method = 'cash', payments = null, userId = null }) {
  if (!Array.isArray(items) || items.length === 0) throw Object.assign(new Error('Items requeridos'), { status: 400 });
  const settings = await db.all('SELECT key, value FROM settings');
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
  const taxRate = parseFloat(map.tax_rate || '0');

  let subtotal = 0;
  for (const it of items) {
    const product = await db.get('SELECT * FROM products WHERE id = ?', [it.product_id]);
    if (!product) throw Object.assign(new Error(`Producto ${it.product_id} no existe`), { status: 400 });
    if (product.active !== 1) throw Object.assign(new Error('Producto inactivo'), { status: 400 });
    if (product.stock < it.quantity) throw Object.assign(new Error(`Stock insuficiente para ${product.name}`), { status: 400 });
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
  for (const p of payList) {
    await db.run('INSERT INTO payments (sale_id, method, amount, created_at, user_id) VALUES (?, ?, ?, ?, ?)', [sale_id, p.method, p.amount, created_at, userId]);
  }
  if (payList.some(p => p.method === 'credit')) {
    if (!customer_id) throw Object.assign(new Error('Crédito requiere cliente'), { status: 400 });
    await db.run('INSERT INTO receivables (customer_id, sale_id, amount_due, status, created_at) VALUES (?, ?, ?, ?, ?)', [customer_id, sale_id, total, 'open', created_at]);
  }
  if (userId) {
    const session = db.get('SELECT * FROM cash_sessions WHERE closed_at IS NULL AND user_id = ? ORDER BY id DESC LIMIT 1', [userId]);
    const cashAmount = payList.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
    if (session && cashAmount > 0) {
      await db.run('INSERT INTO cash_movements (session_id, type, reference, amount, created_at) VALUES (?, ?, ?, ?, ?)', [session.id, 'sale', `Venta #${sale_id}`, cashAmount, created_at]);
    }
  }
  try { db.audit('sale_create', userId, 'sale', sale_id, { total, payment_method, payments: payList }); } catch {}
  const customer = sale.customer_id ? await db.get('SELECT name, phone, email, rfc FROM customers WHERE id = ?', [sale.customer_id]) : null;
  return { ...sale, customer_name: customer?.name || null, customer_phone: customer?.phone || null, customer_email: customer?.email || null, customer_rfc: customer?.rfc || null, items: saleItems };
}

module.exports = { createSale, deleteSaleWithReversal };
