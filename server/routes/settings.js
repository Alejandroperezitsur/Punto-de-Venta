const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT key, value FROM settings');
    const out = {};
    for (const r of rows) out[r.key] = r.value;
    res.jsonResponse(out);
  } catch (e) {
    res.jsonError(e.message);
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
    res.jsonResponse(out);
  } catch (e) {
    res.jsonError(e.message, 400);
  }
});

module.exports = router;