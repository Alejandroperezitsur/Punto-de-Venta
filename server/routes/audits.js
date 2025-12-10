const express = require('express')
const router = express.Router()
const db = require('../db')
const { auth } = require('./auth')
const { requireRole } = require('../middleware/role')
const { logger } = require('../logger')

function parseFilters(q) {
  const startDate = q.startDate ? new Date(q.startDate).toISOString() : null
  const endDate = q.endDate ? new Date(q.endDate).toISOString() : null
  const userId = q.userId ? String(q.userId) : null
  const event = q.event ? String(q.event) : null
  const search = q.search ? String(q.search).trim() : null
  const limit = Math.min(Math.max(parseInt(q.limit || '20', 10), 1), 200)
  const offset = Math.max(parseInt(q.offset || '0', 10), 0)
  return { startDate, endDate, userId, event, search, limit, offset }
}

router.get('/', auth, requireRole('admin'), (req, res) => {
  const f = parseFilters(req.query)
  const where = []
  const params = []
  if (f.startDate && f.endDate) { where.push('created_at BETWEEN ? AND ?'); params.push(f.startDate, f.endDate) }
  if (f.userId) { where.push('user_id = ?'); params.push(f.userId) }
  if (f.event) { where.push('event = ?'); params.push(f.event) }
  if (f.search) { where.push('(COALESCE(ref_type,"") LIKE ? OR COALESCE(ref_id,"") LIKE ? OR COALESCE(data,"") LIKE ?)'); const s = `%${f.search}%`; params.push(s, s, s) }
  const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : ''
  const order = 'ORDER BY created_at DESC, id DESC'
  const totalRow = db.get(`SELECT COUNT(*) AS total FROM audits ${whereSql}`, params)
  const rows = db.all(`SELECT id, event, user_id, ref_type, ref_id, data, created_at FROM audits ${whereSql} ${order} LIMIT ? OFFSET ?`, [...params, f.limit, f.offset])
  try { logger.info({ filters: f, count: rows.length }, 'audits_list') } catch {}
  try { db.audit('audit_query', req.user.uid, 'audit', null, f) } catch {}
  res.json({ total: totalRow?.total || 0, items: rows, limit: f.limit, offset: f.offset })
})

router.get('/events', auth, requireRole('admin'), (req, res) => {
  const rows = db.all('SELECT DISTINCT event FROM audits ORDER BY event ASC')
  const list = rows.map(r => r.event).filter(Boolean)
  try { logger.info({ count: list.length }, 'audits_events') } catch {}
  res.json(list)
})

module.exports = router
