const express = require('express')
const router = express.Router()
const db = require('../db')
const { auth } = require('./auth')

router.get('/', auth, (req, res) => {
  const rows = db.all('SELECT * FROM receivables ORDER BY id DESC')
  res.json(rows)
})

router.get('/summary/:customer_id', (req, res) => {
  try {
    const rows = db.all('SELECT amount_due, amount_paid, status FROM receivables WHERE customer_id = ?', [req.params.customer_id])
    const open = rows.filter(r => r.status === 'open')
    const count = open.length
    const total_due = +open.reduce((s, r) => s + (r.amount_due - (r.amount_paid || 0)), 0).toFixed(2)
    res.json({ count, total_due })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/by-customer/:customer_id', (req, res) => {
  try {
    const rows = db.all('SELECT id, sale_id, amount_due, amount_paid, status, created_at FROM receivables WHERE customer_id = ? ORDER BY id DESC', [req.params.customer_id])
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/:id/pay', auth, (req, res) => {
  const { amount } = req.body || {}
  const r = db.get('SELECT * FROM receivables WHERE id = ?', [req.params.id])
  if (!r) return res.status(404).json({ error: 'No encontrado' })
  const amt = +parseFloat(amount || 0).toFixed(2)
  if (!isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'Monto inválido' })
  const pending = +(r.amount_due - (r.amount_paid || 0)).toFixed(2)
  if (amt > pending) return res.status(400).json({ error: 'Monto excede pendiente' })
  const paid = +(r.amount_paid + amt).toFixed(2)
  const status = paid >= r.amount_due ? 'closed' : 'open'
  db.run('UPDATE receivables SET amount_paid = ?, status = ? WHERE id = ?', [paid, status, req.params.id])
  try {
    const now = new Date().toISOString()
    db.run('INSERT INTO receivable_payments (receivable_id, user_id, amount, created_at) VALUES (?, ?, ?, ?)', [req.params.id, req.user.uid, amt, now])
  } catch {}
  res.json(db.get('SELECT * FROM receivables WHERE id = ?', [req.params.id]))
})

router.get('/:id/payments', auth, (req, res) => {
  try {
    const rows = db.all(`
      SELECT rp.id, rp.amount, rp.created_at, u.username
      FROM receivable_payments rp
      LEFT JOIN users u ON u.id = rp.user_id
      WHERE rp.receivable_id = ?
      ORDER BY rp.created_at DESC, rp.id DESC
    `, [req.params.id])
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
