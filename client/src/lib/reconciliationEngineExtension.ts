import { getDB } from './db';
import { metrics } from './metricsCollector';

export interface StockChecksum {
  productId: string;
  localStock: number;
  serverStock: number;
  divergence: number;
  checksum: string;
  lastVerified: number;
}

export interface ReconciliationSnapshot {
  id: string;
  storeId: string;
  timestamp: number;
  checksums: StockChecksum[];
  totalDivergence: number;
  status: 'pending' | 'completed' | 'failed';
}

export interface DivergenceReport {
  snapshot: ReconciliationSnapshot;
  criticalDivergences: StockChecksum[];
  totalDivergence: number;
  affectedProducts: number;
  estimatedFinancialImpact: number;
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  repairSuggestions: RepairSuggestion[];
}

export interface RepairSuggestion {
  productId: string;
  productName: string;
  localStock: number;
  serverStock: number;
  divergence: number;
  suggestedAction: 'use_server' | 'use_local' | 'merge' | 'manual_review';
  description: string;
  confidence: number;
}

export async function computeStockChecksums(products: Array<{ id: string; stock: number; name?: string }>): Promise<Map<string, StockChecksum>> {
  const checksums = new Map<string, StockChecksum>();
  for (const p of products) {
    const data = `${p.id}:${p.stock}`;
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
    const checksum = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    checksums.set(p.id, {
      productId: p.id,
      localStock: p.stock,
      serverStock: p.stock,
      divergence: 0,
      checksum,
      lastVerified: Date.now(),
    });
  }
  return checksums;
}

export async function createReconciliationSnapshot(storeId: string): Promise<ReconciliationSnapshot> {
  const db = await getDB();
  const products = await db.getAll('products');
  const checksumMap = await computeStockChecksums(products.map(p => ({ id: p.id, stock: p.stock ?? 0, name: p.name })));

  const snapshot: ReconciliationSnapshot = {
    id: `rec-snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    storeId,
    timestamp: Date.now(),
    checksums: Array.from(checksumMap.values()),
    totalDivergence: 0,
    status: 'pending',
  };

  await db.put('reconciliationSnapshots', snapshot);
  return snapshot;
}

export async function compareSnapshots(local: ReconciliationSnapshot, server: ReconciliationSnapshot): Promise<DivergenceReport> {
  const localMap = new Map(local.checksums.map(c => [c.productId, c]));
  const serverMap = new Map(server.checksums.map(c => [c.productId, c]));

  const criticalDivergences: StockChecksum[] = [];
  let totalDivergence = 0;
  const allIds = new Set([...localMap.keys(), ...serverMap.keys()]);

  for (const id of allIds) {
    const l = localMap.get(id);
    const s = serverMap.get(id);
    if (!l || !s) {
      criticalDivergences.push({
        productId: id,
        localStock: l?.localStock ?? 0,
        serverStock: s?.localStock ?? 0,
        divergence: (l?.localStock ?? 0) - (s?.localStock ?? 0),
        checksum: '',
        lastVerified: Date.now(),
      });
      continue;
    }
    const divergence = l.localStock - s.localStock;
    if (divergence !== 0) {
      criticalDivergences.push({ ...l, serverStock: s.localStock, divergence });
      totalDivergence += Math.abs(divergence);
    }
  }

  const affectedProducts = criticalDivergences.length;
  const estimatedFinancialImpact = totalDivergence * 50;
  const severity: DivergenceReport['severity'] =
    affectedProducts === 0 ? 'none' :
    affectedProducts <= 3 ? 'low' :
    affectedProducts <= 10 ? 'medium' :
    affectedProducts <= 30 ? 'high' : 'critical';

  const repairSuggestions = criticalDivergences.map(d => {
    const absDiv = Math.abs(d.divergence);
    const suggestedAction: RepairSuggestion['suggestedAction'] =
      d.localStock === 0 ? 'use_server' :
      d.serverStock === 0 ? 'use_local' :
      absDiv <= 3 ? 'merge' : 'manual_review';

    return {
      productId: d.productId,
      productName: d.productId,
      localStock: d.localStock,
      serverStock: d.serverStock,
      divergence: d.divergence,
      suggestedAction,
      description: suggestedAction === 'merge'
        ? `Diferencia de ${absDiv} unidades — merge automático seguro`
        : suggestedAction === 'manual_review'
        ? `Diferencia crítica de ${absDiv} unidades — requiere revisión manual urgente`
        : `Usar stock de ${suggestedAction === 'use_server' ? 'servidor' : 'local'} (el otro está en 0)`,
      confidence: suggestedAction === 'merge' ? 0.9 : suggestedAction === 'manual_review' ? 0.3 : 0.7,
    };
  });

  const report: DivergenceReport = {
    snapshot: local,
    criticalDivergences,
    totalDivergence,
    affectedProducts,
    estimatedFinancialImpact,
    severity,
    repairSuggestions,
  };

  metrics.setGauge('pos_reconciliation_drift', { store_id: local.storeId }, affectedProducts);

  return report;
}

export async function applyRepair(checksum: StockChecksum, action: RepairSuggestion['suggestedAction']): Promise<void> {
  const db = await getDB();
  const product = await db.get('products', checksum.productId);
  if (!product) return;

  switch (action) {
    case 'use_server':
      product.stock = checksum.serverStock;
      break;
    case 'use_local':
      break;
    case 'merge':
      product.stock = Math.round((checksum.localStock + checksum.serverStock) / 2);
      break;
    case 'manual_review':
      return;
  }
  product.updatedAt = Date.now();
  await db.put('products', product);
}

export async function scheduleReconciliationJob(storeId: string): Promise<void> {
  const db = await getDB();
  const snapshot = await createReconciliationSnapshot(storeId);
  await db.put('reconciliationJobs', {
    id: `job-${Date.now()}`,
    snapshotId: snapshot.id,
    storeId,
    status: 'scheduled',
    scheduledAt: Date.now(),
    completedAt: null,
  });
}
