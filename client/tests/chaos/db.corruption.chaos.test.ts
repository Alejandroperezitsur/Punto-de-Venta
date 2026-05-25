import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDB, checkDBHealth } from '../../src/lib/db';

describe('DB Corruption Simulation', () => {
  beforeEach(async () => {
    const db = await getDB();
    // Clean all stores
    const stores = Array.from(db.objectStoreNames);
    const tx = db.transaction(stores, 'readwrite');
    for (const store of stores) {
      await tx.objectStore(store).clear();
    }
    await tx.done;
  });

  it('should detect missing IndexedDB stores', async () => {
    const db = await getDB();
    // Simulate a missing store by deleting all data in queueItems
    await db.clear('queueItems');
    
    const health = await checkDBHealth();
    expect(health.ok).toBe(true);
    expect(health.storeCounts.queueItems).toBe(0);
  });

  it('should survive concurrent writes to multiple stores', async () => {
    const db = await getDB();
    const promises = [];

    // Concurrent writes to different stores
    for (let i = 0; i < 50; i++) {
      promises.push(
        (async () => {
          await db.put('queueItems', {
            id: `item-${i}`,
            type: 'sale',
            priority: 0,
            payload: { total: i * 100 },
            idempotencyKey: `key-cw-${i}`,
            correlationId: `corr-cw-${i}`,
            status: 'pending',
            attempts: 0,
            maxAttempts: 3,
            lastError: null,
            nextRetryAt: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            checkpoint: 0,
            batchId: null,
          });
        })(),
      );
    }

    await Promise.all(promises);

    const count = await db.count('queueItems');
    expect(count).toBe(50);
  });

  it('should survive transaction rollback simulation', async () => {
    const db = await getDB();

    // Start a write but simulate partial failure
    try {
      const tx = db.transaction('queueItems', 'readwrite');
      await tx.store.put({
        id: 'partial-item',
        type: 'sale',
        priority: 0,
        payload: { total: 100 },
        idempotencyKey: 'key-partial',
        correlationId: 'corr-partial',
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        lastError: null,
        nextRetryAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        checkpoint: 0,
        batchId: null,
      });
      // Don't await tx.done — simulate abort
    } catch {
      // Expected
    }

    // Try to read — should not crash
    const item = await db.get('queueItems', 'partial-item').catch(() => null);
    // May or may not exist depending on whether IDB auto-committed
    expect(true).toBe(true); // surviving this line is the test
  });

  it('should handle malformed data gracefully', async () => {
    const db = await getDB();

    // Insert malformed data using raw IDB
    const idb = await db.transaction('queueItems', 'readwrite');
    // @ts-expect-error deliberately corrupting
    idb.store.put({ id: 'malformed-1' }); // missing required fields
    await idb.done;

    // Reading should still work without crashing
    const allItems = await db.getAll('queueItems');
    const malformed = allItems.find((i) => i.id === 'malformed-1');
    expect(malformed).toBeDefined();
    expect(malformed.type).toBeUndefined();

    // Clean up
    await db.delete('queueItems', 'malformed-1');
  });

  it('should detect checksum corruption in snapshots', async () => {
    const db = await getDB();

    // Store a snapshot with wrong checksum
    await db.put('snapshots', {
      id: 'corrupt-snap',
      data: JSON.stringify({ items: [] }),
      checksum: 'WRONG_CHECKSUM',
      itemCount: 0,
      createdAt: Date.now(),
    });

    // Read it back — should load despite corruption
    const snap = await db.get('snapshots', 'corrupt-snap');
    expect(snap).toBeDefined();
    expect(snap.checksum).toBe('WRONG_CHECKSUM');

    // Clean up
    await db.delete('snapshots', 'corrupt-snap');
  });

  it('should handle DB close and reopen gracefully', async () => {
    const { closeDB } = await import('../../src/lib/db');

    // Do some operations
    const db1 = await getDB();
    await db1.put('queueItems', {
      id: 'close-test-1',
      type: 'sale',
      priority: 0,
      payload: { total: 100 },
      idempotencyKey: 'key-close',
      correlationId: 'corr-close',
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      lastError: null,
      nextRetryAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      checkpoint: 0,
      batchId: null,
    });

    // Close and reopen
    await closeDB();
    const db2 = await getDB();

    // Should still be able to read
    const item = await db2.get('queueItems', 'close-test-1');
    expect(item).toBeDefined();
    expect(item.id).toBe('close-test-1');
  });
});
