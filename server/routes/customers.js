const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM customers ORDER BY id DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const { name, phone, email, rfc } = req.body;
  try {
    const result = await db.run('INSERT INTO customers (name, phone, email, rfc) VALUES (?, ?, ?, ?)', [name, phone || null, email || null, rfc || null]);
    const row = await db.get('SELECT * FROM customers WHERE id = ?', [result.id]);
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name, phone, email, rfc } = req.body;
  try {
    const current = await db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!current) return res.status(404).json({ error: 'No encontrado' });
    await db.run('UPDATE customers SET name = ?, phone = ?, email = ?, rfc = ? WHERE id = ?', [name ?? current.name, (phone ?? current.phone) || null, (email ?? current.email) || null, (rfc ?? current.rfc) || null, req.params.id]);
    const row = await db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM customers WHERE id = ?', [req.params.id]);
    if (!result.changes) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
