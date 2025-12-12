const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.get('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) return res.jsonError('Credenciales inválidas', 401);
  const ok = bcrypt.compareSync(password || '', user.password_hash);
  if (!ok) return res.jsonError('Credenciales inválidas', 401);
  const token = jwt.sign({ uid: user.id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: '12h' });
  res.jsonResponse({ token, user: { id: user.id, username: user.username, role: user.role } });
});

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.*)$/);
  if (!m) return res.jsonError('No autenticado', 401);
  try {
    req.user = jwt.verify(m[1], JWT_SECRET);
    next();
  } catch (e) {
    res.jsonError('Token inválido', 401);
  }
}

function optionalAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.*)$/);
  if (!m) return next();
  try {
    req.user = jwt.verify(m[1], JWT_SECRET);
  } catch { }
  next();
}

router.get('/me', auth, (req, res) => {
  res.jsonResponse({ user: { id: req.user.uid, role: req.user.role, username: req.user.username } });
});

module.exports = { router, auth, optionalAuth };
