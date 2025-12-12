const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('./auth');
const { receivablePayRules } = require('../validators/receivablesValidator');
const { validationResult } = require('express-validator');

router.get('/', auth, (req, res) => {
  try {
    const rows = db.all('SELECT * FROM receivables ORDER BY id DESC');
    res.jsonResponse(rows);
  } catch (e) {
    res.jsonError(e.message);
  }
});

router.get('/summary/:customer_id', (req, res) => {
  try {
    const rows = db.all('SELECT amount_due, amount_paid, status FROM receivables WHERE customer_id = ?', [req.params.customer_id]);
    const open = rows.filter(r => r.status === 'open');
    const count = open.length;
    const total_due = +open.reduce((s, r) => s + (r.amount_due - (r.amount_paid || 0)), 0).toFixed(2);
    res.jsonResponse({ count, total_due });
  } catch (e) {
    res.jsonError(e.message);
  }
});

router.get('/by-customer/:customer_id', (req, res) => {
  try {
    const rows = db.all('SELECT id, sale_id, amount_due, amount_paid, status, created_at FROM receivables WHERE customer_id = ? ORDER BY id DESC', [req.params.customer_id]);
    res.jsonResponse(rows);
  } catch (e) {
    res.jsonError(e.message);
  }
});

router.post('/:id/pay', auth, receivablePayRules, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.jsonError(errors.array()[0].msg, 400);
  const { amount } = req.body || {};
  const r = db.get('SELECT * FROM receivables WHERE id = ?', [req.params.id]);
  if (!r) return res.jsonError('No encontrado', 404);
  const amt = +parseFloat(amount || 0).toFixed(2);
  if (!isFinite(amt) || amt <= 0) return res.jsonError('Monto inválido', 400);
  const pending = +(r.amount_due - (r.amount_paid || 0)).toFixed(2);
  if (amt > pending) return res.jsonError('Monto excede pendiente', 400);
  const paid = +(r.amount_paid + amt).toFixed(2);
  const status = paid >= r.amount_due ? 'closed' : 'open';
  db.run('UPDATE receivables SET amount_paid = ?, status = ? WHERE id = ?', [paid, status, req.params.id]);
  try {
    const now = new Date().toISOString();
    db.run('INSERT INTO receivable_payments (receivable_id, user_id, amount, created_at) VALUES (?, ?, ?, ?)', [req.params.id, req.user.uid, amt, now]);
    try { db.audit('receivable_pay', req.user.uid, 'receivable', req.params.id, { amount: amt }); } catch { }
  } catch { }
  res.jsonResponse(db.get('SELECT * FROM receivables WHERE id = ?', [req.params.id]));
});

router.get('/:id/payments', auth, (req, res) => {
  try {
    const rows = db.all(`
      SELECT rp.id, rp.amount, rp.created_at, u.username
      FROM receivable_payments rp
      LEFT JOIN users u ON u.id = rp.user_id
      WHERE rp.receivable_id = ?
      ORDER BY rp.created_at DESC, rp.id DESC
    `, [req.params.id]);
    res.jsonResponse(rows);
  } catch (e) {
    res.jsonError(e.message);
  }
});

module.exports = router;
