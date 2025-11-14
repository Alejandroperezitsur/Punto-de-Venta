const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM categories ORDER BY name ASC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  try {
    const result = await db.run('INSERT INTO categories (name) VALUES (?)', [name]);
    const row = await db.get('SELECT * FROM categories WHERE id = ?', [result.id]);
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name } = req.body;
  try {
    const current = await db.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!current) return res.status(404).json({ error: 'No encontrado' });
    await db.run('UPDATE categories SET name = ? WHERE id = ?', [name ?? current.name, req.params.id]);
    const row = await db.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM categories WHERE id = ?', [req.params.id]);
    if (!result.changes) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;