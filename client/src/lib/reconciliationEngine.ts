import { getDB, type InventoryVersion, type ReconciliationLog } from './db';
import { createLogger } from './structuredLogger';

const logger = createLogger('Reconciliation');

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function uid(): string {
  return crypto.randomUUID?.() || 'rec-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

async function getToken(): Promise<string | null> {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

// ─── SHA-256 Hash (Web Crypto API) ───

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── Inventory Checksum ───

export async function computeLocalInventoryChecksum(products: Array<{ id: string; stock: number; version?: number }>): Promise<string> {
  const sorted = [...products].sort((a, b) => a.id.localeCompare(b.id));
  const data = sorted.map((p) => `${p.id}:${p.stock}:${p.version ?? 0}`).join('|');
  return sha256(data);
}

// ─── Inventory Version Vector ───

export async function updateInventoryVersion(
  productId: string,
  storeId: number,
  branchId: string,
): Promise<void> {
  const db = await getDB();
  const existing = await db.get('inventoryVersions', `prod-${productId}`);
  const now = Date.now();

  if (!existing) {
    const iv: InventoryVersion = {
      id: `prod-${productId}`,
      productId,
      version: 1,
      checksum: null,
      lastConflict: null,
      vectorClock: { [branchId]: 1 },
      updatedAt: now,
    };
    await db.put('inventoryVersions', iv);
    return;
  }

  existing.version += 1;
  existing.vectorClock[branchId] = (existing.vectorClock[branchId] || 0) + 1;
  existing.updatedAt = now;
  await db.put('inventoryVersions', existing);
}

// ─── Conflict Detection ───

export interface ConflictInfo {
  productId: string;
  localVersion: number;
  serverVersion: number;
  localClock: Record<string, number>;
  serverClock: Record<string, number>;
  localStock: number;
  serverStock: number;
  detectedAt: number;
}

function detectConflict(
  local: InventoryVersion,
  serverClock: Record<string, number>,
): boolean {
  const allBranches = new Set([...Object.keys(local.vectorClock), ...Object.keys(serverClock)]);
  for (const branch of allBranches) {
    const lv = local.vectorClock[branch] || 0;
    const sv = serverClock[branch] || 0;
    if (lv > sv && sv < (serverClock[branch] ?? 0)) {
      return true;
    }
    if (sv > lv && lv < (local.vectorClock[branch] ?? 0)) {
      return true;
    }
  }
  return false;
}

export async function detectConflicts(
  serverVersions: Array<{ productId: string; version: number; vectorClock: Record<string, number>; stock: number }>,
): Promise<ConflictInfo[]> {
  const db = await getDB();
  const conflicts: ConflictInfo[] = [];

  for (const sv of serverVersions) {
    const local = await db.get('inventoryVersions', `prod-${sv.productId}`);
    if (!local) continue;

    const hasConflict = detectConflict(local, sv.vectorClock);
    if (hasConflict) {
      conflicts.push({
        productId: sv.productId,
        localVersion: local.version,
        serverVersion: sv.version,
        localClock: local.vectorClock,
        serverClock: sv.vectorClock,
        localStock: 0,
        serverStock: sv.stock,
        detectedAt: Date.now(),
      });

      await db.put('reconciliationLogs', {
        id: uid(),
        storeId: 1,
        type: 'conflict',
        productId: sv.productId,
        serverVersion: sv.version,
        clientVersion: local.version,
        driftAmount: null,
        resolution: null,
        details: JSON.stringify({
          localClock: local.vectorClock,
          serverClock: sv.vectorClock,
        }),
        createdAt: Date.now(),
      } as ReconciliationLog);
    }
  }

  return conflicts;
}

// ─── Drift Detection ───

export interface DriftInfo {
  productId: string;
  localStock: number;
  serverStock: number;
  drift: number;
}

export async function detectDrift(
  serverStock: Array<{ productId: string; stock: number }>,
  localStockMap: Map<string, number>,
): Promise<DriftInfo[]> {
  const drifts: DriftInfo[] = [];

  for (const sv of serverStock) {
    const local = localStockMap.get(sv.productId);
    if (local === undefined) continue;
    const drift = Math.abs(local - sv.stock);
    if (drift > 0) {
      drifts.push({
        productId: sv.productId,
        localStock: local,
        serverStock: sv.stock,
        drift,
      });
    }
  }

  return drifts;
}

// ─── Background Reconciliation ───

export interface ReconciliationResult {
  conflicts: number;
  drifts: number;
  checksumMatch: boolean;
  reconciledProducts: number;
}

export async function runReconciliation(storeId: number): Promise<ReconciliationResult> {
  const token = await getToken();
  if (!token) {
    logger.warn('No token, skipping reconciliation');
    return { conflicts: 0, drifts: 0, checksumMatch: true, reconciledProducts: 0 };
  }

  try {
    const response = await fetch(`${API_BASE}/reconciliation/inventory-summary`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Store-ID': String(storeId),
      },
    });

    if (!response.ok) {
      logger.warn('Reconciliation fetch failed', response.status);
      return { conflicts: 0, drifts: 0, checksumMatch: true, reconciledProducts: 0 };
    }

    const json = await response.json().catch(() => ({}));
    const serverData = json.data || json;

    const serverVersions: Array<{ productId: string; version: number; vectorClock: Record<string, number>; stock: number }> =
      serverData.versions || [];

    const serverStock: Array<{ productId: string; stock: number }> = serverData.stock || [];

    const conflicts = await detectConflicts(serverVersions);

    const db = await getDB();
    const localVersions = await db.getAll('inventoryVersions');
    const localStockMap = new Map<string, number>();
    for (const lv of localVersions) {
      localStockMap.set(lv.productId, 0);
    }

    const drifts = await detectDrift(serverStock, localStockMap);

    for (const drift of drifts) {
      await db.put('reconciliationLogs', {
        id: uid(),
        storeId,
        type: 'drift',
        productId: drift.productId,
        serverVersion: null,
        clientVersion: null,
        driftAmount: drift.drift,
        resolution: null,
        details: JSON.stringify({ localStock: drift.localStock, serverStock: drift.serverStock }),
        createdAt: Date.now(),
      } as ReconciliationLog);
    }

    const checksumMatch = await verifyChecksum(storeId, serverData.checksum);

    await db.put('integrityChecks', {
      id: uid(),
      checkId: `reconciliation-${Date.now()}`,
      status: checksumMatch && conflicts.length === 0 ? 'pass' : 'fail',
      details: JSON.stringify({
        conflictsFound: conflicts.length,
        driftsFound: drifts.length,
        checksumMatch,
      }),
      checkedAt: Date.now(),
    });

    logger.info(`Reconciliation complete: ${conflicts.length} conflicts, ${drifts.length} drifts, checksum ${checksumMatch ? 'OK' : 'MISMATCH'}`);

    return {
      conflicts: conflicts.length,
      drifts: drifts.length,
      checksumMatch,
      reconciledProducts: serverVersions.length,
    };
  } catch (e) {
    logger.error('Reconciliation failed', e);
    return { conflicts: 0, drifts: 0, checksumMatch: true, reconciledProducts: 0 };
  }
}

// ─── Checksum Verification ───

async function verifyChecksum(storeId: number, serverChecksum?: string): Promise<boolean> {
  if (!serverChecksum) return true;

  const token = await getToken();
  if (!token) return true;

  try {
    const response = await fetch(`${API_BASE}/reconciliation/inventory-checksum`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Store-ID': String(storeId),
      },
    });
    if (!response.ok) return true;

    const json = await response.json().catch(() => ({}));
    const data = json.data || json;
    const serverHash = data.checksum || serverChecksum;

    const db = await getDB();
    const localVersions = await db.getAll('inventoryVersions');
    const localChecksum = await computeLocalInventoryChecksum(
      localVersions.map((v) => ({ id: v.productId, stock: 0, version: v.version })),
    );

    return localChecksum === serverHash;
  } catch {
    return true;
  }
}

// ─── Conflict Resolution UI Helpers ───

export type ConflictResolution = 'server_wins' | 'client_wins' | 'merge';

export async function resolveConflict(
  productId: string,
  resolution: ConflictResolution,
  storeId: number,
): Promise<void> {
  const db = await getDB();

  const log: ReconciliationLog = {
    id: uid(),
    storeId,
    type: 'resolved',
    productId,
    serverVersion: null,
    clientVersion: null,
    driftAmount: null,
    resolution,
    details: `Resolved via ${resolution}`,
    createdAt: Date.now(),
  };
  await db.put('reconciliationLogs', log);

  const local = await db.get('inventoryVersions', `prod-${productId}`);
  if (local) {
    local.lastConflict = null;
    local.updatedAt = Date.now();
    await db.put('inventoryVersions', local);
  }

  logger.info(`Conflict resolved for ${productId}: ${resolution}`);
}
