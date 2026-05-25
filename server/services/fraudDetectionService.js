const prisma = require('../db');
const { logger } = require('../logger');

// ─── Risk Score Thresholds ───

const THRESHOLDS = {
  WATCH: 30,
  ALERT: 60,
  BLOCK: 85,
};

// ─── Heuristic Results ───

class FraudHeuristic {
  constructor(name, score, details) {
    this.name = name;
    this.score = Math.min(100, Math.max(0, score));
    this.details = details;
    this.severity = score >= THRESHOLDS.BLOCK ? 'block' : score >= THRESHOLDS.ALERT ? 'alert' : 'watch';
  }
}

// ─── Heuristics ───

async function checkAnomalousDiscount(userId, storeId, discountPercent) {
  // Get average discount for this store over last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentSales = await prisma.sale.findMany({
    where: {
      store_id: storeId,
      created_at: { gte: thirtyDaysAgo },
      discount: { gt: 0 },
    },
    select: { discount: true, total: true, subtotal: true },
  });

  if (recentSales.length === 0) {
    if (discountPercent > 50) {
      return new FraudHeuristic('discount_anomaly', 70, `Discount ${discountPercent}% > 50% threshold (no history)`);
    }
    return null;
  }

  const avgDiscountPct = recentSales.reduce((sum, s) => {
    const pct = Number(s.total) > 0 ? (Number(s.discount) / Number(s.subtotal)) * 100 : 0;
    return sum + pct;
  }, 0) / recentSales.length;

  if (discountPercent > avgDiscountPct * 3 && discountPercent > 30) {
    return new FraudHeuristic('discount_anomaly', Math.min(90, Math.round((discountPercent / avgDiscountPct) * 20)),
      `Discount ${discountPercent}% is ${(discountPercent / avgDiscountPct).toFixed(1)}x the store avg ${avgDiscountPct.toFixed(1)}%`);
  }

  if (discountPercent > 80) {
    return new FraudHeuristic('discount_excessive', 85, `Excessive discount: ${discountPercent}%`);
  }

  return null;
}

async function checkSuspiciousReturns(userId, storeId) {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const recentReturns = await prisma.audit.count({
    where: {
      store_id: storeId,
      user_id: userId,
      event: 'sale_reverse',
      created_at: { gte: oneHourAgo },
    },
  });

  if (recentReturns > 5) {
    return new FraudHeuristic('excessive_returns', Math.min(95, 50 + recentReturns * 5),
      `${recentReturns} returns in last hour`);
  }

  if (recentReturns > 3) {
    return new FraudHeuristic('excessive_returns', 50,
      `${recentReturns} returns in last hour`);
  }

  return null;
}

async function checkExcessiveCancellations(userId, storeId) {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const recentCancellations = await prisma.audit.count({
    where: {
      store_id: storeId,
      user_id: userId,
      event: 'sale_reverse',
      created_at: { gte: oneHourAgo },
    },
  });

  if (recentCancellations > 8) {
    return new FraudHeuristic('excessive_cancellations', 90,
      `${recentCancellations} cancellations in last hour`);
  }

  if (recentCancellations > 5) {
    return new FraudHeuristic('excessive_cancellations', 60,
      `${recentCancellations} cancellations in last hour`);
  }

  return null;
}

async function checkExcessiveOfflineSales(userId, storeId) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todaySales = await prisma.sale.count({
    where: {
      store_id: storeId,
      created_at: { gte: todayStart },
    },
  });

  const offlineSales = await prisma.audit.count({
    where: {
      store_id: storeId,
      user_id: userId,
      event: 'offline_sync',
      created_at: { gte: todayStart },
    },
  });

  if (todaySales > 0 && (offlineSales / todaySales) > 0.2) {
    return new FraudHeuristic('excessive_offline', 45,
      `${offlineSales} offline out of ${todaySales} total sales (${((offlineSales / todaySales) * 100).toFixed(1)}%)`);
  }

  return null;
}

async function checkFrequentCashReopen(userId, storeId) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayOpens = await prisma.cashSession.count({
    where: {
      store_id: storeId,
      user_id: userId,
      opened_at: { gte: todayStart },
    },
  });

  if (todayOpens > 5) {
    return new FraudHeuristic('frequent_cash_reopen', 80,
      `Cash opened ${todayOpens} times today`);
  }

  if (todayOpens > 3) {
    return new FraudHeuristic('frequent_cash_reopen', 50,
      `Cash opened ${todayOpens} times today`);
  }

  return null;
}

async function checkStockManipulation(storeId) {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const recentAdjustments = await prisma.inventoryMovement.findMany({
    where: {
      reason: { contains: 'Ajuste manual' },
      created_at: { gte: oneHourAgo },
    },
  });

  if (recentAdjustments.length > 10) {
    return new FraudHeuristic('stock_manipulation', 75,
      `${recentAdjustments.length} manual adjustments in last hour`);
  }

  return null;
}

// ─── Main Detection ───

async function evaluateSaleRisk(userId, storeId, saleData) {
  const heuristics = [];

  if (saleData.discount > 0) {
    const subtotal = saleData.items.reduce((s, i) => s + (parseFloat(i.unit_price) * parseFloat(i.quantity)), 0);
    const discountPct = subtotal > 0 ? (saleData.discount / subtotal) * 100 : 0;
    const result = await checkAnomalousDiscount(userId, storeId, discountPct);
    if (result) heuristics.push(result);
  }

  const checks = await Promise.all([
    checkSuspiciousReturns(userId, storeId),
    checkExcessiveCancellations(userId, storeId),
    checkExcessiveOfflineSales(userId, storeId),
    checkFrequentCashReopen(userId, storeId),
    checkStockManipulation(storeId),
  ]);

  for (const c of checks) {
    if (c) heuristics.push(c);
  }

  const totalScore = heuristics.reduce((s, h) => s + h.score, 0);
  const avgScore = heuristics.length > 0 ? Math.round(totalScore / heuristics.length) : 0;

  return {
    score: avgScore,
    maxScore: Math.max(...heuristics.map((h) => h.score), 0),
    heuristics,
    severity: avgScore >= THRESHOLDS.ALERT ? 'high' : avgScore >= THRESHOLDS.WATCH ? 'medium' : 'low',
    alert: avgScore >= THRESHOLDS.ALERT,
    block: avgScore >= THRESHOLDS.BLOCK,
  };
}

async function logFraudAlert(userId, storeId, riskResult) {
  if (!riskResult.alert) return;

  try {
    await prisma.audit.create({
      data: {
        store_id: storeId,
        event: 'fraud_alert',
        user_id: userId,
        ref_type: 'fraud',
        data: JSON.stringify({
          score: riskResult.score,
          severity: riskResult.severity,
          heuristics: riskResult.heuristics.map((h) => ({ name: h.name, score: h.score, details: h.details })),
        }),
      },
    });

    if (riskResult.block) {
      logger.warn(`FRAUD BLOCK: User ${userId} score ${riskResult.score} - ${riskResult.heuristics.map(h => h.name).join(', ')}`);
    } else {
      logger.warn(`FRAUD ALERT: User ${userId} score ${riskResult.score} - ${riskResult.heuristics.map(h => h.name).join(', ')}`);
    }
  } catch (e) {
    logger.error('Fraud alert logging error', e);
  }
}

module.exports = {
  evaluateSaleRisk,
  logFraudAlert,
  checkAnomalousDiscount,
  checkSuspiciousReturns,
  checkExcessiveCancellations,
  checkExcessiveOfflineSales,
  checkFrequentCashReopen,
  checkStockManipulation,
  THRESHOLDS,
};
