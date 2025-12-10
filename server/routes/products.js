const express = require('express');
const router = express.Router();
const db = require('../db');
const { productCreateRules, productUpdateRules } = require('../validators/productsValidator');
const { validationResult } = require('express-validator');

router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', productCreateRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  const { name, sku, price, cost = 0, stock = 0, category_id = null, active = 1 } = req.body;
  try {
    const result = await db.run(
      'INSERT INTO products (name, sku, price, cost, stock, category_id, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, sku || null, price, cost, stock, category_id, active]
    );
    const row = await db.get('SELECT * FROM products WHERE id = ?', [result.id]);
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/:id', productUpdateRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  const { name, sku, price, cost, stock, category_id, active } = req.body;
  try {
    const current = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!current) return res.status(404).json({ error: 'No encontrado' });
    const result = await db.run(
      'UPDATE products SET name = ?, sku = ?, price = ?, cost = ?, stock = ?, category_id = ?, active = ? WHERE id = ?',
      [
        name ?? current.name,
        (sku ?? current.sku) || null,
        price ?? current.price,
        cost ?? current.cost,
        stock ?? current.stock,
        category_id ?? current.category_id,
        active ?? current.active,
        req.params.id,
      ]
    );
    const row = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (!result.changes) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
