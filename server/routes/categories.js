const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM categories ORDER BY name ASC');
    // Optional: build hierarchy tree here if needed, but returning flat list is fine for now
    res.jsonResponse(rows);
  } catch (e) {
    res.jsonError(e.message);
  }
});

router.post('/', async (req, res) => {
  const { name, parent_id, image_url } = req.body;
  try {
    const result = await db.run(
      'INSERT INTO categories (name, parent_id, image_url) VALUES (?, ?, ?)',
      [name, parent_id || null, image_url || null]
    );
    const row = await db.get('SELECT * FROM categories WHERE id = ?', [result.id]);
    res.jsonResponse(row, { status: 201 });
  } catch (e) {
    res.jsonError(e.message, 400);
  }
});

router.put('/:id', async (req, res) => {
  const { name, parent_id, image_url } = req.body;
  try {
    const current = await db.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!current) return res.jsonError('No encontrado', 404);

    await db.run(
      'UPDATE categories SET name = ?, parent_id = ?, image_url = ? WHERE id = ?',
      [name ?? current.name, parent_id ?? current.parent_id, image_url ?? current.image_url, req.params.id]
    );

    const row = await db.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    res.jsonResponse(row);
  } catch (e) {
    res.jsonError(e.message, 400);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM categories WHERE id = ?', [req.params.id]);
    if (!result.changes) return res.jsonError('No encontrado', 404);
    res.jsonResponse({ ok: true });
  } catch (e) {
    res.jsonError(e.message);
  }
});

module.exports = router;