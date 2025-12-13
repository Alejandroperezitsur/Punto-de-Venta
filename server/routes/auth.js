const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.get('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) return res.jsonError('Credenciales inválidas', 401);
  if (user.active === 0) return res.jsonError('Usuario desactivado', 401);
  const ok = bcrypt.compareSync(password || '', user.password_hash);
  if (!ok) return res.jsonError('Credenciales inválidas', 401);

  // Update last login
  db.run('UPDATE users SET last_login = ? WHERE id = ?', [new Date().toISOString(), user.id]);

  const token = jwt.sign({ uid: user.id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: '12h' });
  res.jsonResponse({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// Refresh token
router.post('/refresh', auth, (req, res) => {
  const token = jwt.sign({ uid: req.user.uid, role: req.user.role, username: req.user.username }, JWT_SECRET, { expiresIn: '12h' });
  res.jsonResponse({ token });
});

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.*)$/);
  if (!m) return res.jsonError('No autenticado', 401);
  try {
    req.user = jwt.verify(m[1], JWT_SECRET);
    next();
  } catch (e) {
    if (e.name === 'TokenExpiredError') {
      return res.jsonError('Sesión expirada', 401);
    }
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

// User Management Endpoints
router.get('/users', auth, requirePermission(PERMISSIONS.USERS_VIEW), (req, res) => {
  const users = db.all('SELECT id, username, role, active, created_at, last_login FROM users ORDER BY id');
  res.jsonResponse(users);
});

router.post('/users', auth, requirePermission(PERMISSIONS.USERS_CREATE), (req, res) => {
  const { username, password, role = 'cajero' } = req.body || {};
  if (!username || !password) {
    return res.jsonError('Usuario y contraseña requeridos', 400);
  }
  if (!['admin', 'supervisor', 'cajero'].includes(role)) {
    return res.jsonError('Rol inválido', 400);
  }
  const exists = db.get('SELECT id FROM users WHERE username = ?', [username]);
  if (exists) {
    return res.jsonError('El usuario ya existe', 400);
  }
  const hash = bcrypt.hashSync(password, 10);
  const result = db.run(
    'INSERT INTO users (username, password_hash, role, active, created_at) VALUES (?, ?, ?, 1, ?)',
    [username, hash, role, new Date().toISOString()]
  );
  db.audit('user_create', req.user.uid, 'user', result.id, { username, role });
  res.jsonResponse({ id: result.id, username, role }, { status: 201 });
});

router.put('/users/:id', auth, requirePermission(PERMISSIONS.USERS_EDIT), (req, res) => {
  const { id } = req.params;
  const { role, password, active } = req.body || {};

  const user = db.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!user) return res.jsonError('Usuario no encontrado', 404);

  // Prevent editing own role or deactivating self
  if (parseInt(id) === req.user.uid && (role && role !== user.role)) {
    return res.jsonError('No puedes cambiar tu propio rol', 400);
  }

  const updates = [];
  const params = [];

  if (role && ['admin', 'supervisor', 'cajero'].includes(role)) {
    updates.push('role = ?');
    params.push(role);
  }
  if (password) {
    updates.push('password_hash = ?');
    params.push(bcrypt.hashSync(password, 10));
  }
  if (active !== undefined) {
    updates.push('active = ?');
    params.push(active ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.jsonError('Nada que actualizar', 400);
  }

  params.push(id);
  db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  db.audit('user_update', req.user.uid, 'user', id, { role, active });

  res.jsonResponse({ ok: true });
});

router.delete('/users/:id', auth, requirePermission(PERMISSIONS.USERS_DELETE), (req, res) => {
  const { id } = req.params;

  // Prevent deleting self
  if (parseInt(id) === req.user.uid) {
    return res.jsonError('No puedes eliminar tu propia cuenta', 400);
  }

  // Prevent deleting main admin
  const user = db.get('SELECT * FROM users WHERE id = ?', [id]);
  if (user && user.username === 'admin') {
    return res.jsonError('No se puede eliminar el administrador principal', 400);
  }

  db.run('DELETE FROM users WHERE id = ?', [id]);
  db.audit('user_delete', req.user.uid, 'user', id, { username: user?.username });

  res.jsonResponse({ ok: true });
});

module.exports = { router, auth, optionalAuth };

