import { getDB, type ClientAuditEvent } from './db';
import { getCorrelationId } from './structuredLogger';

function uid(): string {
  return crypto.randomUUID?.() || 'aud-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

// ─── SHA-256 ───

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── Audit Logger ───

export class AuditLogger {
  private privateKey: string;

  constructor(key?: string) {
    this.privateKey = key ?? 'pos-audit-key-2026';
  }

  private async computeHash(
    event: string,
    prevHash: string | null,
    metadata: string,
    createdAt: number,
  ): Promise<string> {
    const data = `${event}|${prevHash ?? ''}|${metadata}|${createdAt}|${this.privateKey}`;
    return sha256(data);
  }

  async log(event: {
    event: string;
    actor?: string | null;
    refType?: string | null;
    refId?: string | null;
    beforeSnapshot?: unknown;
    afterSnapshot?: unknown;
    metadata?: Record<string, unknown>;
  }): Promise<ClientAuditEvent> {
    const db = await getDB();
    const prev = await db.get('clientAudit', 'last-hash');
    const prevHash = prev?.hash ?? null;

    const createdAt = Date.now();
    const metadataStr = JSON.stringify(event.metadata ?? {});
    const beforeStr = event.beforeSnapshot !== undefined ? JSON.stringify(event.beforeSnapshot) : null;
    const afterStr = event.afterSnapshot !== undefined ? JSON.stringify(event.afterSnapshot) : null;

    const hashSeed = `${event.event}|${prevHash ?? ''}|${metadataStr}|${beforeStr ?? ''}|${afterStr ?? ''}|${createdAt}|${this.privateKey}`;
    const hash = await sha256(hashSeed);

    const auditEvent: ClientAuditEvent = {
      id: uid(),
      event: event.event,
      correlationId: getCorrelationId(),
      actor: event.actor ?? null,
      refType: event.refType ?? null,
      refId: event.refId ?? null,
      beforeSnapshot: beforeStr,
      afterSnapshot: afterStr,
      metadata: metadataStr,
      hash,
      prevHash,
      createdAt,
    };

    await db.put('clientAudit', auditEvent);
    await db.put('clientAudit', { ...auditEvent, id: 'last-hash' });

    return auditEvent;
  }

  async verifyChain(): Promise<{ valid: boolean; brokenAt: string | null; totalEvents: number }> {
    const db = await getDB();
    const allEvents = await db.getAll('clientAudit');
    const events = allEvents
      .filter((e) => e.id !== 'last-hash')
      .sort((a, b) => a.createdAt - b.createdAt);

    let prevHash: string | null = null;
    for (const event of events) {
      const hashSeed = `${event.event}|${prevHash ?? ''}|${event.metadata ?? ''}|${event.beforeSnapshot ?? ''}|${event.afterSnapshot ?? ''}|${event.createdAt}|${this.privateKey}`;
      const computedHash = await sha256(hashSeed);
      if (computedHash !== event.hash) {
        return { valid: false, brokenAt: event.id, totalEvents: events.length };
      }
      if (event.prevHash !== prevHash) {
        return { valid: false, brokenAt: event.id, totalEvents: events.length };
      }
      prevHash = event.hash;
    }

    return { valid: true, brokenAt: null, totalEvents: events.length };
  }

  async getEvents(limit = 100, offset = 0): Promise<ClientAuditEvent[]> {
    const db = await getDB();
    const all = await db.getAll('clientAudit');
    const events = all
      .filter((e) => e.id !== 'last-hash')
      .sort((a, b) => b.createdAt - a.createdAt);
    return events.slice(offset, offset + limit);
  }

  async getEventsByType(event: string, limit = 50): Promise<ClientAuditEvent[]> {
    const db = await getDB();
    const index = db.transaction('clientAudit').store.index('by-event');
    return index.getAll(event);
  }
}

// ─── Singleton ───

let instance: AuditLogger | null = null;

export function getAuditLogger(): AuditLogger {
  if (!instance) {
    instance = new AuditLogger();
  }
  return instance;
}

// ─── Convenience Functions ───

export async function auditLog(
  event: string,
  refType?: string | null,
  refId?: string | null,
  metadata?: Record<string, unknown>,
  beforeSnapshot?: unknown,
  afterSnapshot?: unknown,
): Promise<ClientAuditEvent> {
  const logger = getAuditLogger();
  return logger.log({
    event,
    refType,
    refId,
    metadata,
    beforeSnapshot,
    afterSnapshot,
  });
}
