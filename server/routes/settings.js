const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT key, value FROM settings');
    const out = {};
    for (const r of rows) out[r.key] = r.value;
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/', async (req, res) => {
  const updates = req.body || {};
  try {
    for (const [key, value] of Object.entries(updates)) {
      await db.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, String(value)]);
    }
    const rows = await db.all('SELECT key, value FROM settings');
    const out = {};
    for (const r of rows) out[r.key] = r.value;
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;