const express = require('express')
const router = express.Router()
const db = require('../db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'pos-dev-secret'

router.post('/login', (req, res) => {
  const { username, password } = req.body || {}
  const user = db.get('SELECT * FROM users WHERE username = ?', [username])
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' })
  const ok = bcrypt.compareSync(password || '', user.password_hash)
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' })
  const token = jwt.sign({ uid: user.id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: '12h' })
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } })
})

function auth(req, res, next) {
  const h = req.headers.authorization || ''
  const m = h.match(/^Bearer\s+(.*)$/)
  if (!m) return res.status(401).json({ error: 'No autenticado' })
  try {
    req.user = jwt.verify(m[1], JWT_SECRET)
    next()
  } catch (e) {
    res.status(401).json({ error: 'Token inválido' })
  }
}

router.get('/me', auth, (req, res) => {
  res.json({ user: { id: req.user.uid, role: req.user.role, username: req.user.username } })
})

module.exports = { router, auth }