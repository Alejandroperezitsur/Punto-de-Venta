import { getDB } from './db';
import { metrics } from './metricsCollector';

export interface FinancialCheckResult {
  check: string;
  passed: boolean;
  value: number;
  expected: number;
  divergence: number;
  details: string;
  severity: 'ok' | 'warning' | 'critical';
}

export interface FinancialHealthReport {
  checks: FinancialCheckResult[];
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  criticalFailures: number;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  timestamp: number;
}

export async function verifySalesConsistency(): Promise<FinancialCheckResult> {
  const db = await getDB();
  const sales = await db.getAll('sales');
  const totalFromSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalFromItems = sales.reduce((sum, s) => {
    const items = s.items || [];
    return sum + items.reduce((isum: number, i: any) => isum + (i.price || 0) * (i.quantity || 0), 0);
  }, 0);
  const divergence = Math.round(Math.abs(totalFromSales - totalFromItems) * 100) / 100;

  return {
    check: 'total_sales_consistency',
    passed: divergence < 0.01,
    value: totalFromSales,
    expected: totalFromItems,
    divergence,
    details: divergence < 0.01
      ? `Total ventas ($${totalFromSales}) = suma items ($${totalFromItems})`
      : `DISCREPANCIA: Total ventas ($${totalFromSales}) ≠ suma items ($${totalFromItems})`,
    severity: divergence < 0.01 ? 'ok' : divergence < 1 ? 'warning' : 'critical',
  };
}

export async function verifyInventoryMoneyConsistency(): Promise<FinancialCheckResult> {
  const db = await getDB();
  const movements = await db.getAll('inventoryMovements');
  const sales = await db.getAll('sales');

  const totalStockChanges = movements.reduce((sum, m) => sum + Math.abs(m.change || 0), 0);
  const totalSold = sales.reduce((sum, s) => sum + (s.total || 0), 0);

  const avgPrice = totalStockChanges > 0 ? totalSold / totalStockChanges : 0;
  const isConsistent = avgPrice > 0 && avgPrice < 10000;

  return {
    check: 'inventory_money_consistency',
    passed: isConsistent,
    value: avgPrice,
    expected: 0,
    divergence: Math.abs(avgPrice - (totalSold / Math.max(totalStockChanges, 1))),
    details: isConsistent
      ? `Ratio inventario/dinero consistente (${avgPrice.toFixed(2)} por unidad)`
      : `Ratio anormal inventario/dinero: $${avgPrice.toFixed(2)} por unidad`,
    severity: isConsistent ? 'ok' : 'warning',
  };
}

export async function verifyNoDuplicatePayments(): Promise<FinancialCheckResult> {
  const db = await getDB();
  const sales = await db.getAll('sales');
  const idempotencyKeys = new Map<string, number>();

  for (const sale of sales) {
    const key = sale.idempotency_key || sale.id;
    idempotencyKeys.set(key, (idempotencyKeys.get(key) || 0) + 1);
  }

  const duplicates = Array.from(idempotencyKeys.entries()).filter(([, count]) => count > 1);

  return {
    check: 'duplicate_payment_detection',
    passed: duplicates.length === 0,
    value: duplicates.length,
    expected: 0,
    divergence: duplicates.length,
    details: duplicates.length === 0
      ? 'Sin pagos duplicados detectados'
      : `${duplicates.length} pagos duplicados encontrados`,
    severity: duplicates.length === 0 ? 'ok' : 'critical',
  };
}

export async function verifyNoDuplicateSyncs(): Promise<FinancialCheckResult> {
  const db = await getDB();
  const syncLog = await db.getAll('syncLog');
  const duplicateKeys = new Map<string, number>();

  for (const entry of syncLog) {
    const key = entry.idempotencyKey || entry.id;
    duplicateKeys.set(key, (duplicateKeys.get(key) || 0) + 1);
  }

  const duplicates = Array.from(duplicateKeys.entries()).filter(([, count]) => count > 1);

  return {
    check: 'duplicate_sync_detection',
    passed: duplicates.length === 0,
    value: duplicates.length,
    expected: 0,
    divergence: duplicates.length,
    details: duplicates.length === 0
      ? 'Sin sincronizaciones duplicadas'
      : `${duplicates.length} syncs duplicados encontrados`,
    severity: duplicates.length === 0 ? 'ok' : 'warning',
  };
}

export async function verifyOrphanedMovements(): Promise<FinancialCheckResult> {
  const db = await getDB();
  const movements = await db.getAll('inventoryMovements');
  const products = await db.getAll('products');
  const productIds = new Set(products.map(p => p.id));

  const orphaned = movements.filter(m => !productIds.has(m.product_id));

  return {
    check: 'orphaned_movements',
    passed: orphaned.length === 0,
    value: orphaned.length,
    expected: 0,
    divergence: orphaned.length,
    details: orphaned.length === 0
      ? 'Sin movimientos huérfanos'
      : `${orphaned.length} movimientos sin producto asociado`,
    severity: orphaned.length === 0 ? 'ok' : orphaned.length < 5 ? 'warning' : 'critical',
  };
}

export async function verifyRounding(): Promise<FinancialCheckResult> {
  const db = await getDB();
  const sales = await db.getAll('sales');
  const roundingErrors = sales.filter(s => {
    if (!s.items) return false;
    const calculatedTotal = s.items.reduce((sum: number, i: any) => sum + (i.price || 0) * (i.quantity || 0), 0);
    const tax = calculatedTotal * 0.16;
    const finalTotal = calculatedTotal + tax - (s.discount || 0);
    return Math.abs(finalTotal - s.total) > 0.01;
  });

  return {
    check: 'rounding_verification',
    passed: roundingErrors.length === 0,
    value: roundingErrors.length,
    expected: 0,
    divergence: roundingErrors.length,
    details: roundingErrors.length === 0
      ? 'Todos los cálculos de redondeo son correctos'
      : `${roundingErrors.length} ventas con error de redondeo`,
    severity: roundingErrors.length === 0 ? 'ok' : 'warning',
  };
}

export async function verifyDriftAccumulation(): Promise<FinancialCheckResult> {
  const db = await getDB();
  const checksums = await db.getAll('checksums');
  let totalDrift = 0;
  for (const c of checksums) {
    totalDrift += Math.abs(c.divergence || 0);
  }

  return {
    check: 'drift_accumulation',
    passed: totalDrift === 0,
    value: totalDrift,
    expected: 0,
    divergence: totalDrift,
    details: totalDrift === 0
      ? 'Sin drift acumulado'
      : `${totalDrift} unidades de drift acumuladas`,
    severity: totalDrift === 0 ? 'ok' : totalDrift < 10 ? 'warning' : 'critical',
  };
}

export async function generateFinancialHealthReport(): Promise<FinancialHealthReport> {
  const checks = await Promise.all([
    verifySalesConsistency(),
    verifyInventoryMoneyConsistency(),
    verifyNoDuplicatePayments(),
    verifyNoDuplicateSyncs(),
    verifyOrphanedMovements(),
    verifyRounding(),
    verifyDriftAccumulation(),
  ]);

  const passedChecks = checks.filter(c => c.passed).length;
  const failedChecks = checks.filter(c => !c.passed).length;
  const criticalFailures = checks.filter(c => c.severity === 'critical').length;

  const overallHealth: FinancialHealthReport['overallHealth'] =
    criticalFailures > 0 ? 'critical' :
    failedChecks > 0 ? 'degraded' : 'healthy';

  for (const check of checks) {
    if (check.severity === 'critical') {
      metrics.incrementCounter('pos_financial_anomaly', { check: check.check });
    }
  }

  return {
    checks,
    totalChecks: checks.length,
    passedChecks,
    failedChecks,
    criticalFailures,
    overallHealth,
    timestamp: Date.now(),
  };
}
