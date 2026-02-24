const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { auth } = require('./auth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');

router.post('/open', auth, requirePermission(PERMISSIONS.CASH_OPEN), async (req, res) => {
  const { opening_balance = 0 } = req.body || {};
  try {
    const open = await prisma.cashSession.findFirst({
      where: {
        user_id: req.user.uid,
        store_id: req.user.storeId,
        closed_at: null
      }
    });

    if (open) return res.jsonError('Ya existe caja abierta para este usuario en esta tienda', 400);

    const session = await prisma.cashSession.create({
      data: {
        user_id: req.user.uid,
        store_id: req.user.storeId, // Ensure session is linked to store
        opening_balance: parseFloat(opening_balance),
        status: 'open',
        opened_at: new Date()
      }
    });

    try {
      await prisma.audit.create({
        data: {
          store_id: req.user.storeId,
          event: 'cash_open',
          user_id: req.user.uid,
          ref_type: 'cash_session',
          ref_id: session.id,
          data: JSON.stringify({ opening_balance })
        }
      });
    } catch { }

    res.jsonResponse(session, { status: 201 });
  } catch (e) {
    console.error(e);
    res.jsonError('Error al abrir caja', 500);
  }
});

router.post('/close', auth, requirePermission(PERMISSIONS.CASH_CLOSE), async (req, res) => {
  try {
    const session = await prisma.cashSession.findFirst({
      where: {
        user_id: req.user.uid,
        store_id: req.user.storeId,
        closed_at: null
      }
    });
    if (!session) return res.jsonError('No hay caja abierta', 400);

    const agg = await prisma.cashMovement.aggregate({
      _sum: { amount: true },
      where: { session_id: session.id }
    });

    const closing_balance = session.opening_balance + (agg._sum.amount || 0);

    const closed = await prisma.cashSession.update({
      where: { id: session.id },
      data: {
        closed_at: new Date(),
        closing_balance,
        status: 'closed'
      }
    });

    try {
      await prisma.audit.create({
        data: {
          store_id: req.user.storeId,
          event: 'cash_close',
          user_id: req.user.uid,
          ref_type: 'cash_session',
          ref_id: session.id,
          data: JSON.stringify({ closing_balance })
        }
      });
    } catch { }

    res.jsonResponse(closed);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al cerrar caja', 500);
  }
});

router.get('/status', auth, requirePermission(PERMISSIONS.CASH_VIEW), async (req, res) => {
  try {
    const session = await prisma.cashSession.findFirst({
      where: {
        user_id: req.user.uid,
        store_id: req.user.storeId,
        closed_at: null
      }
    });
    res.jsonResponse({ session });
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener estado de caja', 500);
  }
});

router.get('/movements', auth, requirePermission(PERMISSIONS.CASH_VIEW), async (req, res) => {
  try {
    const session = await prisma.cashSession.findFirst({
      where: {
        user_id: req.user.uid,
        store_id: req.user.storeId,
        closed_at: null
      }
    });
    if (!session) return res.jsonError('No hay caja abierta', 400);

    const rows = await prisma.cashMovement.findMany({
      where: { session_id: session.id },
      orderBy: { id: 'desc' }
    });
    res.jsonResponse(rows);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener movimientos', 500);
  }
});

router.post('/withdraw', auth, requirePermission(PERMISSIONS.CASH_WITHDRAW), async (req, res) => {
  const { amount, reference = 'Retiro' } = req.body || {};
  try {
    const session = await prisma.cashSession.findFirst({
      where: {
        user_id: req.user.uid,
        store_id: req.user.storeId,
        closed_at: null
      }
    });
    if (!session) return res.jsonError('No hay caja abierta', 400);

    await prisma.cashMovement.create({
      data: {
        session_id: session.id,
        type: 'withdraw',
        reference,
        amount: -Math.abs(amount || 0),
        created_at: new Date()
      }
    });

    try {
      await prisma.audit.create({
        data: {
          store_id: req.user.storeId,
          event: 'cash_withdraw',
          user_id: req.user.uid,
          ref_type: 'cash_session',
          ref_id: session.id,
          data: JSON.stringify({ amount: -Math.abs(amount || 0), reference })
        }
      });
    } catch { }

    res.jsonResponse({ ok: true }, { status: 201 });
  } catch (e) {
    console.error(e);
    res.jsonError('Error al realizar retiro', 500);
  }
});

router.post('/deposit', auth, requirePermission(PERMISSIONS.CASH_DEPOSIT), async (req, res) => {
  const { amount, reference = 'Depósito' } = req.body || {};
  try {
    const session = await prisma.cashSession.findFirst({
      where: {
        user_id: req.user.uid,
        store_id: req.user.storeId,
        closed_at: null
      }
    });
    if (!session) return res.jsonError('No hay caja abierta', 400);

    await prisma.cashMovement.create({
      data: {
        session_id: session.id,
        type: 'deposit',
        reference,
        amount: Math.abs(amount || 0),
        created_at: new Date()
      }
    });

    try {
      await prisma.audit.create({
        data: {
          store_id: req.user.storeId,
          event: 'cash_deposit',
          user_id: req.user.uid,
          ref_type: 'cash_session',
          ref_id: session.id,
          data: JSON.stringify({ amount: Math.abs(amount || 0), reference })
        }
      });
    } catch { }

    res.jsonResponse({ ok: true }, { status: 201 });
  } catch (e) {
    console.error(e);
    res.jsonError('Error al realizar depósito', 500);
  }
});

module.exports = router;
