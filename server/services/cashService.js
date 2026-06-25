const prisma = require('../db');

function toDecimal(value) {
  return Math.round((Number(value) || 0) * 10000) / 10000;
}

async function openSession({ userId, storeId, openingBalance = 0 }) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.cashSession.findFirst({
      where: { user_id: userId, store_id: storeId, status: 'open' }
    });

    if (existing) {
      throw Object.assign(new Error(`Ya existe sesión de caja abierta (ID: ${existing.id}) desde ${existing.opened_at}`), { status: 409 });
    }

    const session = await tx.cashSession.create({
      data: {
        user_id: userId,
        store_id: storeId,
        opening_balance: toDecimal(openingBalance),
        status: 'open',
        opened_at: new Date()
      }
    });

    if (Number(openingBalance) > 0) {
      await tx.cashMovement.create({
        data: {
          session_id: session.id,
          type: 'opening',
          reference: 'Apertura de caja',
          amount: toDecimal(openingBalance),
          created_at: new Date()
        }
      });
    }

    try {
      await tx.audit.create({
        data: {
          store_id: storeId,
          event: 'cash_open',
          user_id: userId,
          ref_type: 'cash_session',
          ref_id: session.id,
          data: JSON.stringify({ opening_balance: openingBalance })
        }
      });
    } catch { }

    return session;
  });
}

async function closeSession({ userId, storeId, countedCash }) {
  return await prisma.$transaction(async (tx) => {
    const session = await tx.cashSession.findFirst({
      where: { user_id: userId, store_id: storeId, status: 'open' },
      orderBy: { id: 'desc' }
    });

    if (!session) {
      throw Object.assign(new Error('No hay sesión de caja abierta'), { status: 400 });
    }

    if (session.closed_at) {
      throw Object.assign(new Error('Esta sesión ya fue cerrada'), { status: 409 });
    }

    const movements = await tx.cashMovement.findMany({
      where: { session_id: session.id }
    });

    let expectedCash = Number(session.opening_balance);
    for (const m of movements) {
      if (m.type === 'sale' || m.type === 'deposit') {
        expectedCash += Number(m.amount);
      } else if (m.type === 'withdraw') {
        expectedCash -= Math.abs(Number(m.amount));
      }
    }

    const counted = toDecimal(countedCash);
    const difference = toDecimal(counted - expectedCash);

    const closed = await tx.cashSession.update({
      where: { id: session.id },
      data: {
        closed_at: new Date(),
        status: Math.abs(difference) < 0.01 ? 'closed' : 'discrepancy',
        closing_balance: toDecimal(expectedCash),
        counted_cash: counted,
        expected_cash: toDecimal(expectedCash),
        difference
      }
    });

    try {
      await tx.audit.create({
        data: {
          store_id: storeId,
          event: 'cash_close',
          user_id: userId,
          ref_type: 'cash_session',
          ref_id: session.id,
          data: JSON.stringify({
            counted_cash: Number(counted),
            expected_cash: expectedCash,
            difference: Number(difference),
            movements_count: movements.length
          })
        }
      });
    } catch { }

    return {
      id: closed.id,
      opened_at: closed.opened_at,
      closed_at: closed.closed_at,
      opening_balance: Number(closed.opening_balance),
      closing_balance: Number(closed.closing_balance),
      counted_cash: Number(closed.counted_cash),
      expected_cash: Number(closed.expected_cash),
      difference: Number(closed.difference),
      status: closed.status
    };
  });
}

async function addMovement({ userId, storeId, type, amount, reference }) {
  return await prisma.$transaction(async (tx) => {
    const session = await tx.cashSession.findFirst({
      where: { user_id: userId, store_id: storeId, status: 'open' }
    });

    if (!session) {
      throw Object.assign(new Error('No hay sesión de caja abierta'), { status: 400 });
    }

    if (type === 'withdraw') {
      const movements = await tx.cashMovement.findMany({ where: { session_id: session.id } });
      let currentBalance = Number(session.opening_balance);
      for (const m of movements) {
        if (m.type === 'sale' || m.type === 'deposit') currentBalance += Number(m.amount);
        else if (m.type === 'withdraw') currentBalance -= Math.abs(Number(m.amount));
      }
      if (Math.abs(toDecimal(amount)) > currentBalance + 0.001) {
        throw Object.assign(new Error(`Fondos insuficientes. Disponible: $${currentBalance.toFixed(2)}, solicitado: $${Math.abs(toDecimal(amount)).toFixed(2)}`), { status: 400 });
      }
    }

    const movement = await tx.cashMovement.create({
      data: {
        session_id: session.id,
        type,
        reference: reference || (type === 'deposit' ? 'Depósito' : 'Retiro'),
        amount: type === 'withdraw' ? -Math.abs(toDecimal(amount)) : toDecimal(amount),
        created_at: new Date()
      }
    });

    try {
      await tx.audit.create({
        data: {
          store_id: storeId,
          event: type === 'deposit' ? 'cash_deposit' : 'cash_withdraw',
          user_id: userId,
          ref_type: 'cash_session',
          ref_id: session.id,
          data: JSON.stringify({ amount: Number(movement.amount), reference })
        }
      });
    } catch { }

    return movement;
  });
}

async function getSessionStatus({ userId, storeId }) {
  const session = await prisma.cashSession.findFirst({
    where: { user_id: userId, store_id: storeId, status: 'open' },
    orderBy: { id: 'desc' }
  });

  if (!session) return { session: null };

  const movements = await prisma.cashMovement.findMany({
    where: { session_id: session.id },
    orderBy: { id: 'desc' }
  });

  let salesTotal = 0;
  let depositsTotal = 0;
  let withdrawalsTotal = 0;

  for (const m of movements) {
    if (m.type === 'sale') salesTotal += Number(m.amount);
    else if (m.type === 'deposit') depositsTotal += Number(m.amount);
    else if (m.type === 'withdraw') withdrawalsTotal += Math.abs(Number(m.amount));
  }

  const expectedCash = Number(session.opening_balance) + salesTotal + depositsTotal - withdrawalsTotal;

  return {
    session: {
      ...session,
      opening_balance: Number(session.opening_balance),
      expected_cash: expectedCash
    },
    summary: {
      sales: salesTotal,
      deposits: depositsTotal,
      withdrawals: withdrawalsTotal,
      expected: expectedCash
    },
    movements: movements.map(m => ({
      ...m,
      amount: Number(m.amount)
    }))
  };
}

async function getSessionHistory({ storeId, limit = 50, cursor }) {
  const where = { store_id: storeId, status: { not: 'open' } };

  const sessions = await prisma.cashSession.findMany({
    where,
    orderBy: { closed_at: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { user: { select: { id: true, username: true } } }
  });

  const hasMore = sessions.length > limit;
  const nextCursor = hasMore ? sessions[sessions.length - 1].id : null;
  const data = hasMore ? sessions.slice(0, limit) : sessions;

  return {
    data: data.map(s => ({
      id: s.id,
      user: s.user?.username,
      opened_at: s.opened_at,
      closed_at: s.closed_at,
      opening_balance: Number(s.opening_balance),
      closing_balance: Number(s.closing_balance),
      counted_cash: Number(s.counted_cash || 0),
      expected_cash: Number(s.expected_cash || 0),
      difference: Number(s.difference || 0),
      status: s.status
    })),
    pagination: { nextCursor, hasMore }
  };
}

async function getDailySummary({ storeId, date }) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const sales = await prisma.sale.findMany({
    where: {
      store_id: storeId,
      created_at: { gte: dayStart, lte: dayEnd }
    },
    include: { payments: true }
  });

  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const cashRevenue = sales.reduce((sum, s) => {
    const cashPayments = s.payments.filter(p => p.method === 'cash');
    return sum + cashPayments.reduce((cs, cp) => cs + Number(cp.amount), 0);
  }, 0);

  const sessions = await prisma.cashSession.findMany({
    where: {
      store_id: storeId,
      opened_at: { gte: dayStart, lte: dayEnd }
    }
  });

  const discrepancies = sessions.filter(s => s.status === 'discrepancy');

  return {
    date: date.toISOString().split('T')[0],
    totalSales,
    totalRevenue,
    cashRevenue,
    cardRevenue: totalRevenue - cashRevenue,
    sessionsOpened: sessions.length,
    sessionsWithDiscrepancies: discrepancies.length,
    discrepancies: discrepancies.map(s => ({
      session_id: s.id,
      difference: Number(s.difference || 0),
      counted: Number(s.counted_cash || 0),
      expected: Number(s.expected_cash || 0)
    }))
  };
}

module.exports = {
  openSession,
  closeSession,
  addMovement,
  getSessionStatus,
  getSessionHistory,
  getDailySummary
};
