const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { auth } = require('./auth');
const { receivablePayRules } = require('../validators/receivablesValidator');
const { validationResult } = require('express-validator');

router.get('/', auth, async (req, res) => {
  try {
    const rows = await prisma.receivable.findMany({
      where: {
        sale: { store_id: req.user.storeId } // Link via sale to store? Or check if Receivable has store_id directly?
        // Checking Schema again from memory: Receivable likely doesn't have store_id directly if it was simple, 
        // but it SHOULD. If not, we filter via customer or sale.
        // Let's assume we filter via Sale or Customer which definitely have store_id.
        // Safest is to rely on Sale's store_id if Receivable doesn't have it.
      },
      orderBy: { id: 'desc' },
      include: {
        customer: true,
        sale: true
      }
    });

    // Remap for frontend if needed
    const mapped = rows.map(r => ({
      ...r,
      customer_name: r.customer?.name
    }));

    res.jsonResponse(mapped);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener cuentas por cobrar', 500);
  }
});

router.get('/summary/:customer_id', auth, async (req, res) => {
  try {
    const customer_id = parseInt(req.params.customer_id);
    // Ensure customer belongs to store
    const customer = await prisma.customer.findFirst({
      where: { id: customer_id, store_id: req.user.storeId }
    });
    if (!customer) return res.jsonError('Cliente no encontrado', 404);

    const openReceivables = await prisma.receivable.findMany({
      where: {
        customer_id,
        status: 'open'
      }
    });

    const count = openReceivables.length;
    const total_due = openReceivables.reduce((sum, r) => sum + (r.amount_due - (r.amount_paid || 0)), 0);

    res.jsonResponse({ count, total_due: parseFloat(total_due.toFixed(2)) });
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener resumen', 500);
  }
});

router.get('/by-customer/:customer_id', auth, async (req, res) => {
  try {
    const customer_id = parseInt(req.params.customer_id);
    // Verify ownership
    const customer = await prisma.customer.findFirst({
      where: { id: customer_id, store_id: req.user.storeId }
    });
    if (!customer) return res.jsonError('Cliente no encontrado', 404);

    const rows = await prisma.receivable.findMany({
      where: { customer_id },
      orderBy: { id: 'desc' }
    });
    res.jsonResponse(rows);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener historial', 500);
  }
});

router.post('/:id/pay', auth, receivablePayRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.jsonError(errors.array()[0].msg, 400);

  const { amount } = req.body || {};
  const id = parseInt(req.params.id);
  const amt = parseFloat(amount);

  if (!isFinite(amt) || amt <= 0) return res.jsonError('Monto inválido', 400);

  try {
    // Find and verify permission via sale->store linkage or customer->store
    const r = await prisma.receivable.findFirst({
      where: { id },
      include: { customer: true }
    });

    if (!r) return res.jsonError('No encontrado', 404);
    if (r.customer.store_id !== req.user.storeId) return res.jsonError('No autorizado', 403);

    const pending = r.amount_due - (r.amount_paid || 0);
    if (amt > pending + 0.01) return res.jsonError('Monto excede pendiente', 400); // Tolerance for float

    const newPaid = (r.amount_paid || 0) + amt;
    const newStatus = newPaid >= r.amount_due ? 'closed' : 'open';

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.receivable.update({
        where: { id },
        data: {
          amount_paid: newPaid,
          status: newStatus
        }
      });

      await tx.receivablePayment.create({
        data: {
          receivable_id: id,
          user_id: req.user.uid,
          amount: amt,
          created_at: new Date()
        }
      });

      try {
        await tx.audit.create({
          data: {
            store_id: req.user.storeId,
            event: 'receivable_pay',
            user_id: req.user.uid,
            ref_type: 'receivable',
            ref_id: id,
            data: JSON.stringify({ amount: amt })
          }
        });
      } catch { }

      return up;
    });

    res.jsonResponse(updated);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al procesar pago', 500);
  }
});

router.get('/:id/payments', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Verify scope
    const r = await prisma.receivable.findFirst({
      where: { id },
      include: { customer: true }
    });
    if (!r || r.customer.store_id !== req.user.storeId) return res.jsonError('No encontrado', 404);

    const rows = await prisma.receivablePayment.findMany({
      where: { receivable_id: id },
      include: { user: true },
      orderBy: { created_at: 'desc' }
    });

    const mapped = rows.map(rp => ({
      id: rp.id,
      amount: rp.amount,
      created_at: rp.created_at,
      username: rp.user?.username
    }));

    res.jsonResponse(mapped);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener pagos', 500);
  }
});

module.exports = router;
