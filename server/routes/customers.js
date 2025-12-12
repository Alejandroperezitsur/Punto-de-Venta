const express = require('express');
const router = express.Router();
const db = require('../db');
const { customersCreateRules, customersUpdateRules } = require('../validators/customersValidator');
const { validationResult } = require('express-validator');

router.get('/', async (req, res) => {
  try {
    const q = req.query.q;
    let rows;
    if (q) {
      rows = await db.all('SELECT * FROM customers WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? ORDER BY id DESC', [`%${q}%`, `%${q}%`, `%${q}%`]);
    } else {
      rows = await db.all('SELECT * FROM customers ORDER BY id DESC');
    }
    res.jsonResponse(rows);
  } catch (e) {
    res.jsonError(e.message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!row) return res.jsonError('No encontrado', 404);
    res.jsonResponse(row);
  } catch (e) {
    res.jsonError(e.message);
  }
});

router.post('/', customersCreateRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.jsonError(errors.array()[0].msg, 400);
  const { name, phone, email, rfc } = req.body;
  try {
    const result = await db.run('INSERT INTO customers (name, phone, email, rfc) VALUES (?, ?, ?, ?)', [name, phone || null, email || null, rfc || null]);
    const row = await db.get('SELECT * FROM customers WHERE id = ?', [result.id]);
    res.jsonResponse(row, { status: 201 });
  } catch (e) {
    res.jsonError(e.message, 400);
  }
});

router.put('/:id', customersUpdateRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.jsonError(errors.array()[0].msg, 400);
  const { name, phone, email, rfc } = req.body;
  try {
    const current = await db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!current) return res.jsonError('No encontrado', 404);
    await db.run('UPDATE customers SET name = ?, phone = ?, email = ?, rfc = ? WHERE id = ?', [name ?? current.name, (phone ?? current.phone) || null, (email ?? current.email) || null, (rfc ?? current.rfc) || null, req.params.id]);
    const row = await db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    res.jsonResponse(row);
  } catch (e) {
    res.jsonError(e.message, 400);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM customers WHERE id = ?', [req.params.id]);
    if (!result.changes) return res.jsonError('No encontrado', 404);
    res.jsonResponse({ ok: true });
  } catch (e) {
    res.jsonError(e.message);
  }
});

module.exports = router;
