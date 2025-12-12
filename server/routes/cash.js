const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('./auth');
const { requireRole } = require('../middleware/role');

router.post('/open', auth, requireRole('admin', 'cajero'), (req, res) => {
  const { opening_balance = 0 } = req.body || {};
  const open = db.get('SELECT * FROM cash_sessions WHERE closed_at IS NULL AND user_id = ?', [req.user.uid]);
  if (open) return res.jsonError('Ya existe caja abierta', 400);
  const created_at = new Date().toISOString();
  const r = db.run('INSERT INTO cash_sessions (user_id, opened_at, opening_balance, status) VALUES (?, ?, ?, ?)', [req.user.uid, created_at, opening_balance, 'open']);
  try { db.audit('cash_open', req.user.uid, 'cash_session', r.id, { opening_balance }); } catch { }
  res.jsonResponse(db.get('SELECT * FROM cash_sessions WHERE id = ?', [r.id]), { status: 201 });
});

router.post('/close', auth, requireRole('admin', 'cajero'), (req, res) => {
  const session = db.get('SELECT * FROM cash_sessions WHERE closed_at IS NULL AND user_id = ?', [req.user.uid]);
  if (!session) return res.jsonError('No hay caja abierta', 400);
  const totalMov = db.get('SELECT SUM(amount) AS sum FROM cash_movements WHERE session_id = ?', [session.id]);
  const closing_balance = +(session.opening_balance + (totalMov?.sum || 0)).toFixed(2);
  const closed_at = new Date().toISOString();
  db.run('UPDATE cash_sessions SET closed_at = ?, closing_balance = ?, status = ? WHERE id = ?', [closed_at, closing_balance, 'closed', session.id]);
  try { db.audit('cash_close', req.user.uid, 'cash_session', session.id, { closing_balance }); } catch { }
  res.jsonResponse(db.get('SELECT * FROM cash_sessions WHERE id = ?', [session.id]));
});

router.get('/status', auth, requireRole('admin', 'cajero'), (req, res) => {
  const session = db.get('SELECT * FROM cash_sessions WHERE closed_at IS NULL AND user_id = ?', [req.user.uid]);
  res.jsonResponse({ session });
});

router.get('/movements', auth, requireRole('admin', 'cajero'), (req, res) => {
  const session = db.get('SELECT * FROM cash_sessions WHERE closed_at IS NULL AND user_id = ?', [req.user.uid]);
  if (!session) return res.jsonError('No hay caja abierta', 400);
  const rows = db.all('SELECT * FROM cash_movements WHERE session_id = ? ORDER BY id DESC', [session.id]);
  res.jsonResponse(rows);
});

router.post('/withdraw', auth, requireRole('admin'), (req, res) => {
  const { amount, reference = 'Retiro' } = req.body || {};
  const session = db.get('SELECT * FROM cash_sessions WHERE closed_at IS NULL AND user_id = ?', [req.user.uid]);
  if (!session) return res.jsonError('No hay caja abierta', 400);
  const created_at = new Date().toISOString();
  db.run('INSERT INTO cash_movements (session_id, type, reference, amount, created_at) VALUES (?, ?, ?, ?, ?)', [session.id, 'withdraw', reference, -Math.abs(amount || 0), created_at]);
  try { db.audit('cash_withdraw', req.user.uid, 'cash_session', session.id, { amount: -Math.abs(amount || 0), reference }); } catch { }
  res.jsonResponse({ ok: true }, { status: 201 });
});

router.post('/deposit', auth, requireRole('admin', 'cajero'), (req, res) => {
  const { amount, reference = 'Depósito' } = req.body || {};
  const session = db.get('SELECT * FROM cash_sessions WHERE closed_at IS NULL AND user_id = ?', [req.user.uid]);
  if (!session) return res.jsonError('No hay caja abierta', 400);
  const created_at = new Date().toISOString();
  db.run('INSERT INTO cash_movements (session_id, type, reference, amount, created_at) VALUES (?, ?, ?, ?, ?)', [session.id, 'deposit', reference, Math.abs(amount || 0), created_at]);
  try { db.audit('cash_deposit', req.user.uid, 'cash_session', session.id, { amount: Math.abs(amount || 0), reference }); } catch { }
  res.jsonResponse({ ok: true }, { status: 201 });
});

module.exports = router;
