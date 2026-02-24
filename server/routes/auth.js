const express = require('express');
const router = express.Router();
const prisma = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');

// Helper to get active store for user
const getActiveStore = async (userId, storeId) => {
  const where = { user_id: userId };
  if (storeId) where.store_id = parseInt(storeId);

  // Find user associations
  const userStores = await prisma.userStore.findMany({
    where: { user_id: userId },
    include: { store: true }
  });

  if (userStores.length === 0) return null;

  // If storeId requested, verify access
  if (storeId) {
    return userStores.find(us => us.store_id === parseInt(storeId)) || null;
  }

  // Default to first store if only one exists
  // SaaS: If multiple, frontend should handle selection, but here we can default to first
  // For now, return first. Ideally strict SaaS requires selection.
  return userStores[0];
};

router.post('/login', async (req, res) => {
  try {
    const { username, password, storeId } = req.body || {};

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) return res.jsonError('Credenciales inválidas', 401);
    if (user.active === 0) return res.jsonError('Usuario desactivado', 401);

    const ok = await bcrypt.compare(password || '', user.password_hash);
    if (!ok) return res.jsonError('Credenciales inválidas', 401);

    // Multi-tenant check
    const userStores = await prisma.userStore.findMany({
      where: { user_id: user.id },
      include: { store: true }
    });

    if (userStores.length === 0) {
      return res.jsonError('Usuario no asignado a ninguna tienda', 403);
    }

    let selectedStore = null;

    // If storeId provided, use it
    if (storeId) {
      selectedStore = userStores.find(us => us.store_id === parseInt(storeId));
      if (!selectedStore) return res.jsonError('Acceso denegado a esta tienda', 403);
    } else if (userStores.length === 1) {
      selectedStore = userStores[0];
    } else {
      // Multiple stores: Return list for selection
      return res.jsonResponse({
        requireStoreSelection: true,
        stores: userStores.map(us => ({
          id: us.store.id,
          name: us.store.name,
          role: us.role
        })),
        tempToken: jwt.sign({ uid: user.id, partial: true }, JWT_SECRET, { expiresIn: '5m' })
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() }
    });

    const token = jwt.sign({
      uid: user.id,
      storeId: selectedStore.store_id,
      role: selectedStore.role,
      username: user.username,
      is_super_admin: user.is_super_admin // Added
    }, JWT_SECRET, { expiresIn: '12h' });

    res.jsonResponse({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: selectedStore.role,
        storeId: selectedStore.store_id,
        storeName: selectedStore.store.name,
        is_super_admin: user.is_super_admin // Added
      }
    });

  } catch (error) {
    console.error(error);
    res.jsonError('Error al iniciar sesión', 500);
  }
});

// Select store with partial token
router.post('/select-store', async (req, res) => {
  try {
    const { storeId, tempToken } = req.body;
    if (!tempToken) return res.jsonError('Token requerido', 400);

    let payload;
    try {
      payload = jwt.verify(tempToken, JWT_SECRET);
    } catch {
      return res.jsonError('Token inválido o expirado', 401);
    }

    if (!payload.partial) return res.jsonError('Token inválido', 401);

    const userStore = await prisma.userStore.findUnique({
      where: {
        user_id_store_id: {
          user_id: payload.uid,
          store_id: parseInt(storeId)
        }
      },
      include: { store: true, user: true }
    });

    if (!userStore) return res.jsonError('Acceso denegado', 403);

    const token = jwt.sign({
      uid: payload.uid,
      storeId: userStore.store_id,
      role: userStore.role,
      username: userStore.user.username,
      is_super_admin: userStore.user.is_super_admin // Added
    }, JWT_SECRET, { expiresIn: '12h' });

    res.jsonResponse({
      token,
      user: {
        id: payload.uid,
        username: userStore.user.username,
        role: userStore.role,
        storeId: userStore.store_id,
        storeName: userStore.store.name,
        is_super_admin: userStore.user.is_super_admin // Added
      }
    });

  } catch (error) {
    console.error(error);
    res.jsonError('Error al seleccionar tienda', 500);
  }
});

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.*)$/);
  if (!m) return res.jsonError('No autenticado', 401);
  try {
    req.user = jwt.verify(m[1], JWT_SECRET);
    if (!req.user.storeId && !req.user.partial) {
      // Legacy token support? Or just reject.
      // For migration, we might default to storeId 1 if missing?
      // No, let's enforce storeId.
    }
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
    next();
  } catch (e) {
    if (e.name === 'TokenExpiredError') {
      return res.jsonError('Sesión expirada', 401);
    }
    res.jsonError('Token inválido', 401);
  }
}

function requireSuperAdmin(req, res, next) {
  if (!req.user || !req.user.is_super_admin) {
    return res.jsonError('Requiere privilegios de Super Admin', 403);
  }
  next();
}

// User Management Endpoints
router.get('/users', auth, requirePermission(PERMISSIONS.USERS_VIEW), async (req, res) => {
  try {
    const userStores = await prisma.userStore.findMany({
      where: { store_id: req.user.storeId },
      include: { user: true }
    });

    const users = userStores.map(us => ({
      id: us.user.id,
      username: us.user.username,
      role: us.role,
      active: us.user.active,
      created_at: us.user.created_at,
      last_login: us.user.last_login
    }));

    res.jsonResponse(users);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener usuarios', 500);
  }
});

router.post('/users', auth, requirePermission(PERMISSIONS.USERS_CREATE), async (req, res) => {
  const { username, password, role = 'cajero' } = req.body || {};
  if (!username || !password) return res.jsonError('Usuario y contraseña requeridos', 400);
  if (!['admin', 'supervisor', 'cajero'].includes(role)) return res.jsonError('Rol inválido', 400);

  try {
    const hash = await bcrypt.hash(password, 10);

    // Check if user exists globally
    let user = await prisma.user.findUnique({ where: { username } });

    if (user) {
      // Check if already in this store
      const existingLink = await prisma.userStore.findUnique({
        where: { user_id_store_id: { user_id: user.id, store_id: req.user.storeId } }
      });
      if (existingLink) return res.jsonError('El usuario ya existe en esta tienda', 400);

      // Link existing user
      await prisma.userStore.create({
        data: {
          user_id: user.id,
          store_id: req.user.storeId,
          role
        }
      });
    } else {
      // Create new user and link
      user = await prisma.user.create({
        data: {
          username,
          password_hash: hash,
          active: 1,
          stores: {
            create: {
              store_id: req.user.storeId,
              role
            }
          }
        }
      });
    }

    // Audit
    await prisma.audit.create({
      data: {
        store_id: req.user.storeId,
        event: 'user_create',
        user_id: req.user.uid,
        ref_type: 'user',
        ref_id: user.id,
        data: JSON.stringify({ username, role })
      }
    });

    res.jsonResponse({ id: user.id, username, role }, { status: 201 });
  } catch (e) {
    console.error(e);
    res.jsonError('Error al crear usuario', 500);
  }
});

router.put('/users/:id', auth, requirePermission(PERMISSIONS.USERS_EDIT), async (req, res) => {
  const { id } = req.params;
  const { role, password, active } = req.body || {};
  const userId = parseInt(id);

  // Verify user exists in this store
  const userStore = await prisma.userStore.findUnique({
    where: { user_id_store_id: { user_id: userId, store_id: req.user.storeId } }
  });

  if (!userStore) return res.jsonError('Usuario no encontrado', 404);

  // Prevent editing own role
  if (userId === req.user.uid && role && role !== req.user.role) {
    return res.jsonError('No puedes cambiar tu propio rol', 400);
  }

  try {
    // Update Role
    if (role) {
      await prisma.userStore.update({
        where: { id: userStore.id },
        data: { role }
      });
    }

    // Update Password/Active (Global effect! Warning)
    // Multi-tenant: Should password be global? Yes usually.
    // Active: If active=0, disabled globally. Maybe we need 'active' in UserStore?
    // Schema has User.active. UserStore doesn't.
    // For now, update Global User.
    const userUpdates = {};
    if (password) userUpdates.password_hash = await bcrypt.hash(password, 10);
    if (active !== undefined) userUpdates.active = active ? 1 : 0;

    if (Object.keys(userUpdates).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: userUpdates
      });
    }

    await prisma.audit.create({
      data: {
        store_id: req.user.storeId,
        event: 'user_update',
        user_id: req.user.uid,
        ref_type: 'user',
        ref_id: userId,
        data: JSON.stringify({ role, active })
      }
    });

    res.jsonResponse({ ok: true });
  } catch (e) {
    console.error(e);
    res.jsonError('Error al actualizar usuario', 500);
  }
});

router.delete('/users/:id', auth, requirePermission(PERMISSIONS.USERS_DELETE), async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  if (userId === req.user.uid) return res.jsonError('No puedes eliminar tu propia cuenta', 400);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user && user.username === 'admin') return res.jsonError('No se puede eliminar el super admin', 400);

  try {
    // Unlink from store
    await prisma.userStore.deleteMany({
      where: { user_id: userId, store_id: req.user.storeId }
    });

    // Check if has other stores
    const remaining = await prisma.userStore.count({ where: { user_id: userId } });
    if (remaining === 0) {
      // Delete user globally (optional, maybe keep?)
      // If we delete user, we lose audit logs linked to user_id (unless set null).
      // Schema: audits.user_id -> User(id).
      // Let's keep user inactive or delete?
      // "Partiendo del estado actual" -> deleted.
      // await prisma.user.delete({ where: { id: userId } });
    }

    await prisma.audit.create({
      data: {
        store_id: req.user.storeId,
        event: 'user_delete',
        user_id: req.user.uid,
        ref_type: 'user',
        ref_id: userId,
        data: JSON.stringify({ username: user?.username })
      }
    });

    res.jsonResponse({ ok: true });
  } catch (e) {
    console.error(e);
    res.jsonError('Error al eliminar usuario', 500);
  }
});

module.exports = { router, auth, optionalAuth, requireSuperAdmin };
