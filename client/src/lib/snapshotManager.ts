import { getDB, type Snapshot, type QueueItem, type QueueCheckpoint } from './db';
import { createLogger } from './structuredLogger';

const logger = createLogger('Snapshot');

function uid(): string {
  return crypto.randomUUID?.() || 'snap-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

// ─── SHA-256 ───

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── Snapshot Creation ───

export interface SnapshotState {
  queueItems: QueueItem[];
  checkpoints: QueueCheckpoint[];
  timestamp: number;
}

export async function createSnapshot(): Promise<string> {
  const db = await getDB();

  const queueItems = await db.getAll('queueItems');
  const checkpoints = await db.getAll('queueCheckpoints');

  const state: SnapshotState = {
    queueItems,
    checkpoints,
    timestamp: Date.now(),
  };

  const serialized = JSON.stringify(state);
  const checksum = await sha256(serialized);

  const snapshot: Snapshot = {
    id: uid(),
    data: serialized,
    checksum,
    itemCount: queueItems.length,
    createdAt: Date.now(),
  };

  await db.put('snapshots', snapshot);

  const allSnapshots = await db.getAll('snapshots');
  allSnapshots.sort((a, b) => a.createdAt - b.createdAt);
  while (allSnapshots.length > 10) {
    const oldest = allSnapshots.shift();
    if (oldest) {
      await db.delete('snapshots', oldest.id);
    }
  }

  logger.info(`Snapshot created: ${queueItems.length} items`);
  return snapshot.id;
}

// ─── Crash Recovery ───

export interface RecoveryResult {
  recovered: boolean;
  restoredItems: number;
  restoredCheckpoints: number;
  errors: string[];
}

export async function attemptCrashRecovery(): Promise<RecoveryResult> {
  const result: RecoveryResult = {
    recovered: false,
    restoredItems: 0,
    restoredCheckpoints: 0,
    errors: [],
  };

  try {
    const db = await getDB();
    const snapshots = await db.getAll('snapshots');
    if (snapshots.length === 0) {
      logger.info('No snapshots found, skipping recovery');
      result.recovered = true;
      return result;
    }

    snapshots.sort((a, b) => b.createdAt - a.createdAt);
    const latest = snapshots[0];

    const computedChecksum = await sha256(latest.data);
    if (computedChecksum !== latest.checksum) {
      logger.error('Latest snapshot checksum MISMATCH, data corrupted');
      result.errors.push('Snapshot checksum mismatch');

      if (snapshots.length > 1) {
        logger.info('Trying previous snapshot');
        return recoverFromSnapshot(snapshots[1], result);
      }
      result.recovered = false;
      return result;
    }

    return await recoverFromSnapshot(latest, result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown recovery error';
    logger.error('Crash recovery failed', msg);
    result.errors.push(msg);
    result.recovered = false;
    return result;
  }
}

async function recoverFromSnapshot(snapshot: Snapshot, result: RecoveryResult): Promise<RecoveryResult> {
  try {
    const state: SnapshotState = JSON.parse(snapshot.data);
    const db = await getDB();

    const existingItems = await db.getAll('queueItems');
    const existingIds = new Set(existingItems.map((i) => i.id));

    let restored = 0;
    for (const item of state.queueItems) {
      if (!existingIds.has(item.id) && item.status !== 'delivered' && item.status !== 'done') {
        await db.put('queueItems', item);
        restored++;
      }
    }
    result.restoredItems = restored;

    for (const cp of state.checkpoints) {
      await db.put('queueCheckpoints', cp);
      result.restoredCheckpoints++;
    }

    result.recovered = true;
    logger.info(`Recovered: ${restored} items, ${result.restoredCheckpoints} checkpoints`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Parse error';
    result.errors.push(msg);
    result.recovered = false;
  }

  return result;
}

// ─── Cart Rollback ───

export interface CartRollbackResult {
  rolledBack: boolean;
  checkoutId: string | null;
  reason: string;
}

export async function attemptCartRollback(): Promise<CartRollbackResult> {
  try {
    const db = await getDB();
    const cart = await db.get('cartPersist', 'current');

    if (!cart) {
      return { rolledBack: false, checkoutId: null, reason: 'No persisted cart found' };
    }

    if (!cart.checkoutId) {
      return { rolledBack: false, checkoutId: null, reason: 'No active checkout' };
    }

    const cartAge = Date.now() - cart.updated_at;
    if (cartAge < 60000) {
      return { rolledBack: false, checkoutId: cart.checkoutId, reason: 'Cart is recent, keeping' };
    }

    if (cartAge > 86400000) {
      await db.delete('cartPersist', 'current');
      return { rolledBack: true, checkoutId: cart.checkoutId, reason: 'Cart expired (>24h), rolled back' };
    }

    await db.delete('cartPersist', 'current');
    logger.info(`Cart rolled back: checkout ${cart.checkoutId}, age ${Math.round(cartAge / 1000)}s`);
    return { rolledBack: true, checkoutId: cart.checkoutId, reason: `Cart stale (${Math.round(cartAge / 1000)}s), rolled back` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown';
    return { rolledBack: false, checkoutId: null, reason: `Rollback error: ${msg}` };
  }
}

// ─── Integrity Check ───

export interface IntegrityResult {
  queueConsistent: boolean;
  checkpointsValid: boolean;
  snapshotValid: boolean;
  noOrphans: boolean;
  details: string[];
}

export async function runIntegrityCheck(): Promise<IntegrityResult> {
  const result: IntegrityResult = {
    queueConsistent: true,
    checkpointsValid: true,
    snapshotValid: true,
    noOrphans: true,
    details: [],
  };

  try {
    const db = await getDB();
    const now = Date.now();

    // Check for orphans (processing items stuck for > 5 min)
    const allItems = await db.getAll('queueItems');
    const orphans = allItems.filter(
      (i) => i.status === 'processing' && i.updatedAt < now - 300000,
    );
    if (orphans.length > 0) {
      result.noOrphans = false;
      result.details.push(`${orphans.length} orphan items detected`);
      for (const o of orphans) {
        o.status = 'pending';
        o.lastError = 'Recovered by integrity check';
        o.updatedAt = now;
        await db.put('queueItems', o);
        await db.put('orphanLog', {
          id: uid(),
          operationId: o.id,
          type: 'integrity_recovery',
          detectedAt: now,
          resolution: 'reverted_to_pending',
        });
      }
    }

    // Validate checkpoints
    const checkpoints = await db.getAll('queueCheckpoints');
    for (const cp of checkpoints) {
      if (cp.lastProcessedId) {
        const item = await db.get('queueItems', cp.lastProcessedId);
        if (!item) {
          result.checkpointsValid = false;
          result.details.push(`Checkpoint ${cp.id} references missing item ${cp.lastProcessedId}`);
        }
      }
    }

    // Validate latest snapshot
    const snapshots = await db.getAll('snapshots');
    if (snapshots.length > 0) {
      snapshots.sort((a, b) => b.createdAt - a.createdAt);
      const latest = snapshots[0];
      const checksum = await sha256(latest.data);
      if (checksum !== latest.checksum) {
        result.snapshotValid = false;
        result.details.push('Latest snapshot checksum mismatch');
      }
    }

    // Consistency: no duplicate idempotency keys
    const idempotencyKeys = new Map<string, string[]>();
    for (const item of allItems) {
      const existing = idempotencyKeys.get(item.idempotencyKey) || [];
      existing.push(item.id);
      idempotencyKeys.set(item.idempotencyKey, existing);
    }
    for (const [key, ids] of idempotencyKeys.entries()) {
      if (ids.length > 1) {
        result.queueConsistent = false;
        result.details.push(`Duplicate idempotency key ${key}: ${ids.join(', ')}`);
      }
    }

    await db.put('integrityChecks', {
      id: uid(),
      checkId: `integrity-${Date.now()}`,
      status: result.queueConsistent && result.checkpointsValid && result.snapshotValid && result.noOrphans ? 'pass' : 'fail',
      details: JSON.stringify(result.details),
      checkedAt: now,
    });

    logger.info(`Integrity check: ${result.details.length > 0 ? result.details.join('; ') : 'ALL PASS'}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown';
    result.details.push(`Check error: ${msg}`);
    logger.error('Integrity check failed', msg);
  }

  return result;
}

// ─── Queue Replay Safe ───

export async function safeQueueReplay(): Promise<number> {
  const db = await getDB();
  const allItems = await db.getAll('queueItems');
  let replayed = 0;

  for (const item of allItems) {
    if (item.status === 'dead' || item.status === 'processing') {
      item.status = 'pending';
      item.attempts = 0;
      item.lastError = null;
      item.nextRetryAt = Date.now() + 2000;
      item.updatedAt = Date.now();
      await db.put('queueItems', item);
      replayed++;
    }
  }

  logger.info(`Safe replay: ${replayed} items reset to pending`);
  return replayed;
}
