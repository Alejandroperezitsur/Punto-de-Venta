const express = require('express');
const router = express.Router();
const db = require('../db');
const { productCreateRules, productUpdateRules } = require('../validators/productsValidator');
const { validationResult } = require('express-validator');

// Helper to attach barcodes
const attachBarcodes = async (products) => {
  if (!products.length) return products;
  // This is a simple implementation, N+1 problem if not careful, but for SQLite local logic it's acceptable or we can optimize
  // Optimization: Load all barcodes for these products
  const ids = products.map(p => p.id);
  const barcodes = await db.all(`SELECT * FROM product_barcodes WHERE product_id IN (${ids.join(',')})`);
  return products.map(p => ({
    ...p,
    barcodes: barcodes.filter(b => b.product_id === p.id).map(b => b.code)
  }));
};

router.get('/', async (req, res) => {
  try {
    const q = req.query.q;
    let rows;
    if (q) {
      rows = await db.all(`
        SELECT DISTINCT p.* FROM products p 
        LEFT JOIN product_barcodes b ON p.id = b.product_id 
        WHERE p.name LIKE ? OR p.sku LIKE ? OR b.code = ?
        ORDER BY p.id DESC
      `, [`%${q}%`, `%${q}%`, q]);
    } else {
      rows = await db.all('SELECT * FROM products ORDER BY id DESC');
    }
    // const withBarcodes = await attachBarcodes(rows); // Optional: overhead? 
    res.jsonResponse(rows);
  } catch (e) {
    res.jsonError(e.message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!row) return res.jsonError('No encontrado', 404);
    const barcodes = await db.all('SELECT code FROM product_barcodes WHERE product_id = ?', [row.id]);
    row.barcodes = barcodes.map(b => b.code);
    res.jsonResponse(row);
  } catch (e) {
    res.jsonError(e.message);
  }
});

router.get('/scan/:code', async (req, res) => {
  try {
    const code = req.params.code;
    // Check main SKU
    let row = await db.get('SELECT * FROM products WHERE sku = ? AND active = 1', [code]);
    // Check extra barcodes
    if (!row) {
      row = await db.get(`
        SELECT p.* FROM products p 
        JOIN product_barcodes b ON p.id = b.product_id 
        WHERE b.code = ? AND p.active = 1
      `, [code]);
    }
    if (!row) return res.jsonError('Producto no encontrado', 404);
    res.jsonResponse(row);
  } catch (e) {
    res.jsonError(e.message);
  }
});

router.get('/:id/movements', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM inventory_movements WHERE product_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.jsonResponse(rows);
  } catch (e) {
    res.jsonError(e.message);
  }
});

router.post('/', productCreateRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.jsonError(errors.array()[0].msg, 400);

  const { name, sku, price, cost = 0, stock = 0, category_id = null, active = 1, image_url = '', barcodes = [] } = req.body;

  try {
    const result = await db.run(
      'INSERT INTO products (name, sku, price, cost, stock, category_id, active, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, sku || null, price, cost, stock, category_id, active, image_url]
    );
    const newId = result.id;

    if (stock !== 0) {
      await db.run(
        'INSERT INTO inventory_movements (product_id, change, reason, created_at) VALUES (?, ?, ?, ?)',
        [newId, stock, 'Inventario Inicial', new Date().toISOString()]
      );
    }

    if (Array.isArray(barcodes)) {
      for (const code of barcodes) {
        if (code && code.trim()) {
          try { await db.run('INSERT INTO product_barcodes (product_id, code, created_at) VALUES (?, ?, ?)', [newId, code.trim(), new Date().toISOString()]); } catch { }
        }
      }
    }

    const row = await db.get('SELECT * FROM products WHERE id = ?', [newId]);
    res.jsonResponse(row, { status: 201 });
  } catch (e) {
    res.jsonError(e.message, 400);
  }
});

router.put('/:id', productUpdateRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.jsonError(errors.array()[0].msg, 400);

  const { name, sku, price, cost, stock, category_id, active, image_url, barcodes } = req.body;
  const id = req.params.id;

  try {
    const current = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!current) return res.jsonError('No encontrado', 404);

    const oldStock = current.stock;
    const newStock = stock !== undefined ? parseFloat(stock) : oldStock;
    const diff = +(newStock - oldStock).toFixed(3);

    await db.run(
      'UPDATE products SET name = ?, sku = ?, price = ?, cost = ?, stock = ?, category_id = ?, active = ?, image_url = ? WHERE id = ?',
      [
        name ?? current.name,
        (sku ?? current.sku) || null,
        price ?? current.price,
        cost ?? current.cost,
        newStock,
        category_id ?? current.category_id,
        active ?? current.active,
        image_url ?? current.image_url,
        id,
      ]
    );

    if (diff !== 0) {
      await db.run(
        'INSERT INTO inventory_movements (product_id, change, reason, created_at) VALUES (?, ?, ?, ?)',
        [id, diff, 'Ajuste Manual', new Date().toISOString()]
      );
    }

    if (Array.isArray(barcodes)) {
      // Replace strategy: remove all and re-insert
      // A bit heavy but safe for now to avoid complexity of diff
      await db.run('DELETE FROM product_barcodes WHERE product_id = ?', [id]);
      for (const code of barcodes) {
        if (code && code.trim()) {
          try { await db.run('INSERT INTO product_barcodes (product_id, code, created_at) VALUES (?, ?, ?)', [id, code.trim(), new Date().toISOString()]); } catch { }
        }
      }
    }

    const row = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    res.jsonResponse(row);
  } catch (e) {
    res.jsonError(e.message, 400);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (!result.changes) return res.jsonError('No encontrado', 404);
    res.jsonResponse({ ok: true });
  } catch (e) {
    res.jsonError(e.message);
  }
});

module.exports = router;
