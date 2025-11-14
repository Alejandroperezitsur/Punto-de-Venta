const express = require('express')
const router = express.Router()
const db = require('../db')
const { auth } = require('./auth')

router.get('/', auth, (req, res) => {
  const rows = db.all('SELECT * FROM receivables ORDER BY id DESC')
  res.json(rows)
})

router.post('/:id/pay', auth, (req, res) => {
  const { amount } = req.body || {}
  const r = db.get('SELECT * FROM receivables WHERE id = ?', [req.params.id])
  if (!r) return res.status(404).json({ error: 'No encontrado' })
  const paid = +(r.amount_paid + Math.abs(amount || 0)).toFixed(2)
  const status = paid >= r.amount_due ? 'closed' : 'open'
  db.run('UPDATE receivables SET amount_paid = ?, status = ? WHERE id = ?', [paid, status, req.params.id])
  res.json(db.get('SELECT * FROM receivables WHERE id = ?', [req.params.id]))
})

module.exports = router