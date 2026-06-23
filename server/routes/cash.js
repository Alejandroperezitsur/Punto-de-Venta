const express = require('express');
const router = express.Router();
const { auth, attachTokenRotation } = require('./auth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');
const {
  openSession,
  closeSession,
  addMovement,
  getSessionStatus,
  getSessionHistory,
  getDailySummary
} = require('../services/cashService');
router.use(attachTokenRotation);

router.post('/open', auth, requirePermission(PERMISSIONS.CASH_OPEN), async (req, res) => {
  const { opening_balance = 0 } = req.body || {};
  try {
    const session = await openSession({
      userId: req.user.uid,
      storeId: req.user.storeId,
      openingBalance: parseFloat(opening_balance) || 0
    });
    res.jsonResponse({ ...session, opening_balance: Number(session.opening_balance) }, { status: 201 });
  } catch (e) {
    if (e.status === 409) return res.jsonError(e.message, 409);
    console.error(e);
    res.jsonError('Error al abrir caja', 500);
  }
});

router.post('/close', auth, requirePermission(PERMISSIONS.CASH_CLOSE), async (req, res) => {
  const { counted_cash } = req.body || {};
  if (counted_cash === undefined || counted_cash === null || counted_cash === '') {
    return res.jsonError('Debes ingresar el dinero contado', 400);
  }
  try {
    const result = await closeSession({
      userId: req.user.uid,
      storeId: req.user.storeId,
      countedCash: parseFloat(counted_cash) || 0
    });
    res.jsonResponse(result);
  } catch (e) {
    if (e.status === 409) return res.jsonError(e.message, 409);
    if (e.status === 400) return res.jsonError(e.message, 400);
    console.error(e);
    res.jsonError('Error al cerrar caja', 500);
  }
});

router.get('/status', auth, requirePermission(PERMISSIONS.CASH_VIEW), async (req, res) => {
  try {
    const result = await getSessionStatus({
      userId: req.user.uid,
      storeId: req.user.storeId
    });
    res.jsonResponse(result);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener estado de caja', 500);
  }
});

router.get('/movements', auth, requirePermission(PERMISSIONS.CASH_VIEW), async (req, res) => {
  try {
    const result = await getSessionStatus({
      userId: req.user.uid,
      storeId: req.user.storeId
    });
    res.jsonResponse(result.movements || []);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener movimientos', 500);
  }
});

router.post('/withdraw', auth, requirePermission(PERMISSIONS.CASH_WITHDRAW), async (req, res) => {
  const { amount, reference = 'Retiro' } = req.body || {};
  if (!amount || parseFloat(amount) <= 0) {
    return res.jsonError('Monto inválido para retiro', 400);
  }
  try {
    const movement = await addMovement({
      userId: req.user.uid,
      storeId: req.user.storeId,
      type: 'withdraw',
      amount: Math.abs(parseFloat(amount)),
      reference
    });
    res.jsonResponse({ ...movement, amount: Number(movement.amount) }, { status: 201 });
  } catch (e) {
    if (e.status === 400) return res.jsonError(e.message, 400);
    console.error(e);
    res.jsonError('Error al realizar retiro', 500);
  }
});

router.post('/deposit', auth, requirePermission(PERMISSIONS.CASH_DEPOSIT), async (req, res) => {
  const { amount, reference = 'Depósito' } = req.body || {};
  if (!amount || parseFloat(amount) <= 0) {
    return res.jsonError('Monto inválido para depósito', 400);
  }
  try {
    const movement = await addMovement({
      userId: req.user.uid,
      storeId: req.user.storeId,
      type: 'deposit',
      amount: Math.abs(parseFloat(amount)),
      reference
    });
    res.jsonResponse({ ...movement, amount: Number(movement.amount) }, { status: 201 });
  } catch (e) {
    if (e.status === 400) return res.jsonError(e.message, 400);
    console.error(e);
    res.jsonError('Error al realizar depósito', 500);
  }
});

router.get('/history', auth, requirePermission(PERMISSIONS.CASH_VIEW), async (req, res) => {
  try {
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : undefined;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const result = await getSessionHistory({
      storeId: req.user.storeId,
      limit,
      cursor
    });
    res.jsonResponse(result);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener historial', 500);
  }
});

router.get('/daily-summary', auth, requirePermission(PERMISSIONS.REPORTS_VIEW), async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const result = await getDailySummary({
      storeId: req.user.storeId,
      date
    });
    res.jsonResponse(result);
  } catch (e) {
    console.error(e);
    res.jsonError('Error al obtener resumen diario', 500);
  }
});

module.exports = router;
