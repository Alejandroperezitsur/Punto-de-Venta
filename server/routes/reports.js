const express = require('express')
const router = express.Router()
const db = require('../db')

function parseRange(q) {
  const from = q.from ? new Date(q.from).toISOString() : new Date('1970-01-01').toISOString()
  const to = q.to ? new Date(q.to).toISOString() : new Date().toISOString()
  return { from, to }
}

router.get('/summary', (req, res) => {
  const { from, to } = parseRange(req.query)
  const rows = db.get('SELECT COUNT(*) AS count, SUM(total) AS total FROM sales WHERE created_at BETWEEN ? AND ?', [from, to])
  res.json(rows)
})

router.get('/products', (req, res) => {
  const { from, to } = parseRange(req.query)
  const rows = db.all(`SELECT si.product_id, p.name, SUM(si.quantity) AS qty, SUM(si.line_total) AS total
    FROM sale_items si JOIN sales s ON si.sale_id = s.id JOIN products p ON si.product_id = p.id
    WHERE s.created_at BETWEEN ? AND ? GROUP BY si.product_id ORDER BY total DESC`, [from, to])
  res.json(rows)
})

router.get('/customers', (req, res) => {
  const { from, to } = parseRange(req.query)
  const rows = db.all(`SELECT s.customer_id, c.name, COUNT(s.id) AS count, SUM(s.total) AS total
    FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.created_at BETWEEN ? AND ? GROUP BY s.customer_id ORDER BY total DESC`, [from, to])
  res.json(rows)
})

module.exports = router