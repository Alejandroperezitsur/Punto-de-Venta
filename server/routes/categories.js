const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { auth } = require('./auth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');

// Note: Categories should probably be authenticated to ensure store isolation.
// Adding auth middleware to all routes here.
router.get('/', auth, requirePermission(PERMISSIONS.PRODUCTS_VIEW), async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { store_id: req.user.storeId }, // Enforce store isolation
      orderBy: { name: 'asc' },
      include: { children: true } // Optional hierarchy
    });
    res.jsonResponse(categories);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener categorías', 500);
  }
});

router.post('/', auth, requirePermission(PERMISSIONS.PRODUCTS_CREATE), async (req, res) => {
  const { name, parent_id, image_url } = req.body;
  try {
    const category = await prisma.category.create({
      data: {
        store_id: req.user.storeId,
        name,
        parent_id: parent_id ? parseInt(parent_id) : null,
        image_url: image_url || null
      }
    });
    res.jsonResponse(category, { status: 201 });
  } catch (e) {
    console.error(e);
    res.jsonError('Error al crear categoría', 400);
  }
});

router.put('/:id', auth, requirePermission(PERMISSIONS.PRODUCTS_EDIT), async (req, res) => {
  const { name, parent_id, image_url } = req.body;
  const id = parseInt(req.params.id);
  try {
    const current = await prisma.category.findFirst({
      where: { id, store_id: req.user.storeId }
    });

    if (!current) return res.jsonError('No encontrado', 404);

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name ?? undefined,
        parent_id: parent_id !== undefined ? (parent_id ? parseInt(parent_id) : null) : undefined,
        image_url: image_url !== undefined ? (image_url || null) : undefined
      }
    });

    res.jsonResponse(updated);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al actualizar categoría', 400);
  }
});

router.delete('/:id', auth, requirePermission(PERMISSIONS.PRODUCTS_DELETE), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const current = await prisma.category.findFirst({
      where: { id, store_id: req.user.storeId }
    });
    if (!current) return res.jsonError('No encontrado', 404);

    await prisma.category.delete({ where: { id } });
    res.jsonResponse({ ok: true });
  } catch (e) {
    console.error(e);
    res.jsonError('Error al eliminar categoría', 500);
  }
});

module.exports = router;
