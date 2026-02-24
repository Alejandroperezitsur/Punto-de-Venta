const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { customersCreateRules, customersUpdateRules } = require('../validators/customersValidator');
const { validationResult } = require('express-validator');
const { auth } = require('./auth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');

router.get('/', auth, requirePermission(PERMISSIONS.CUSTOMERS_VIEW), async (req, res) => {
  try {
    const q = req.query.q;
    const where = { store_id: req.user.storeId };

    if (q) {
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } }
      ];
    }

    // SQLite case-insensitive "contains" note:
    // By default in standard SQL "LIKE" is case-insensitive, but Prisma "contains" might not be depending on collation.
    // For now assuming standard behavior or acceptable limitations.
    const customers = await prisma.customer.findMany({
      where,
      orderBy: { id: 'desc' }
    });

    res.jsonResponse(customers);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener clientes', 500);
  }
});

router.get('/:id', auth, requirePermission(PERMISSIONS.CUSTOMERS_VIEW), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const customer = await prisma.customer.findFirst({
      where: { id, store_id: req.user.storeId }
    });

    if (!customer) return res.jsonError('No encontrado', 404);
    res.jsonResponse(customer);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener cliente', 500);
  }
});

router.post('/', auth, requirePermission(PERMISSIONS.CUSTOMERS_CREATE), customersCreateRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.jsonError(errors.array()[0].msg, 400);
  const { name, phone, email, rfc } = req.body;

  try {
    const customer = await prisma.customer.create({
      data: {
        store_id: req.user.storeId,
        name,
        phone: phone || null,
        email: email || null,
        rfc: rfc || null
      }
    });
    res.jsonResponse(customer, { status: 201 });
  } catch (e) {
    console.error(e);
    res.jsonError('Error al crear cliente', 400);
  }
});

router.put('/:id', auth, requirePermission(PERMISSIONS.CUSTOMERS_EDIT), customersUpdateRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.jsonError(errors.array()[0].msg, 400);
  const { name, phone, email, rfc } = req.body;
  const id = parseInt(req.params.id);

  try {
    const current = await prisma.customer.findFirst({
      where: { id, store_id: req.user.storeId }
    });

    if (!current) return res.jsonError('No encontrado', 404);

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: name ?? undefined,
        phone: phone !== undefined ? (phone || null) : undefined,
        email: email !== undefined ? (email || null) : undefined,
        rfc: rfc !== undefined ? (rfc || null) : undefined
      }
    });

    res.jsonResponse(updated);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al actualizar cliente', 400);
  }
});

router.delete('/:id', auth, requirePermission(PERMISSIONS.CUSTOMERS_DELETE), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const current = await prisma.customer.findFirst({ where: { id, store_id: req.user.storeId } });
    if (!current) return res.jsonError('No encontrado', 404);

    await prisma.customer.delete({ where: { id } });
    res.jsonResponse({ ok: true });
  } catch (e) {
    console.error(e);
    res.jsonError('Error al eliminar cliente', 500);
  }
});

module.exports = router;
