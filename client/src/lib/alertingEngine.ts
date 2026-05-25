import { getDB } from './db';
import { metrics } from './metricsCollector';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'firing' | 'resolved' | 'acknowledged';

export interface AlertRule {
  name: string;
  description: string;
  severity: AlertSeverity;
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'rate_increase';
  threshold: number;
  durationMs: number;
  labels: Record<string, string>;
  cooldownMs: number;
  lastFiredAt: number | null;
}

export interface FiringAlert {
  id: string;
  rule: string;
  severity: AlertSeverity;
  status: AlertStatus;
  value: number;
  threshold: number;
  message: string;
  labels: Record<string, string>;
  firedAt: number;
  resolvedAt: number | null;
  acknowledgedAt: number | null;
}

class AlertingEngine {
  private rules: AlertRule[] = [
    {
      name: 'queue_growth_anormal',
      description: 'Queue crece más de 100 items/minuto',
      severity: 'warning',
      metric: 'pos_queue_growth_rate',
      operator: '>',
      threshold: 100,
      durationMs: 120000,
      labels: {},
      cooldownMs: 300000,
      lastFiredAt: null,
    },
    {
      name: 'sync_stuck',
      description: 'Sync latency > 10s indica sync atascado',
      severity: 'critical',
      metric: 'pos_sync_latency_ms_p95',
      operator: '>',
      threshold: 10000,
      durationMs: 60000,
      labels: { type: 'default' },
      cooldownMs: 300000,
      lastFiredAt: null,
    },
    {
      name: 'drift_financiero',
      description: 'Cash discrepancy > $100',
      severity: 'critical',
      metric: 'pos_cash_discrepancy',
      operator: '>',
      threshold: 100,
      durationMs: 0,
      labels: {},
      cooldownMs: 600000,
      lastFiredAt: null,
    },
    {
      name: 'multiples_retries',
      description: 'Más de 50 retries en 5 minutos',
      severity: 'warning',
      metric: 'pos_retry_count',
      operator: 'rate_increase',
      threshold: 50,
      durationMs: 300000,
      labels: { type: 'sync' },
      cooldownMs: 300000,
      lastFiredAt: null,
    },
    {
      name: 'reconnect_storm',
      description: 'Más de 10 reconexiones en 5 minutos',
      severity: 'warning',
      metric: 'pos_reconnect_count',
      operator: 'rate_increase',
      threshold: 10,
      durationMs: 300000,
      labels: {},
      cooldownMs: 300000,
      lastFiredAt: null,
    },
    {
      name: 'stock_divergence',
      description: 'Diferencia de stock detectada en reconciliación',
      severity: 'critical',
      metric: 'pos_reconciliation_drift',
      operator: '>',
      threshold: 0,
      durationMs: 0,
      labels: {},
      cooldownMs: 600000,
      lastFiredAt: null,
    },
    {
      name: 'cash_discrepancy',
      description: 'Cash drawer discrepancy detectada',
      severity: 'warning',
      metric: 'pos_cash_discrepancy',
      operator: '>',
      threshold: 10,
      durationMs: 0,
      labels: {},
      cooldownMs: 300000,
      lastFiredAt: null,
    },
    {
      name: 'memory_pressure',
      description: 'Memoria del navegador cerca del límite',
      severity: 'warning',
      metric: 'pos_memory_pressure',
      operator: '>',
      threshold: 0,
      durationMs: 0,
      labels: {},
      cooldownMs: 600000,
      lastFiredAt: null,
    },
    {
      name: 'failed_migration',
      description: 'Falló migración de IndexedDB',
      severity: 'critical',
      metric: 'pos_migration_failures',
      operator: 'rate_increase',
      threshold: 1,
      durationMs: 0,
      labels: {},
      cooldownMs: 300000,
      lastFiredAt: null,
    },
  ];

  private firingAlerts: Map<string, FiringAlert> = new Map();
  private evaluationTimer: ReturnType<typeof setInterval> | null = null;
  private previousCounters: Map<string, number> = new Map();

  start(): void {
    this.evaluationTimer = setInterval(() => this.evaluate(), 30000);
  }

  stop(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = null;
    }
  }

  private evaluate(): void {
    const now = Date.now();

    for (const rule of this.rules) {
      if (rule.lastFiredAt && now - rule.lastFiredAt < rule.cooldownMs) continue;

      const key = metrics.encodeKey(rule.metric, rule.labels);
      let value = metrics.getMetric(rule.metric, rule.labels) || 0;

      if (rule.operator === 'rate_increase') {
        const prev = this.previousCounters.get(key) || 0;
        const increase = value - prev;
        this.previousCounters.set(key, value);
        if (increase <= rule.threshold) {
          this.resolveAlert(rule.name);
          continue;
        }
        value = increase;
      }

      let triggered = false;
      switch (rule.operator) {
        case '>': triggered = value > rule.threshold; break;
        case '<': triggered = value < rule.threshold; break;
        case '>=': triggered = value >= rule.threshold; break;
        case '<=': triggered = value <= rule.threshold; break;
        case '==': triggered = value === rule.threshold; break;
        case '!=': triggered = value !== rule.threshold; break;
      }

      if (triggered) {
        this.fireAlert(rule, value, now);
      } else {
        this.resolveAlert(rule.name);
      }
    }
  }

  private async fireAlert(rule: AlertRule, value: number, now: number): Promise<void> {
    if (rule.lastFiredAt && now - rule.lastFiredAt < rule.durationMs) return;
    rule.lastFiredAt = now;

    const alert: FiringAlert = {
      id: `${rule.name}_${now}`,
      rule: rule.name,
      severity: rule.severity,
      status: 'firing',
      value,
      threshold: rule.threshold,
      message: `${rule.description} (actual: ${value}, threshold: ${rule.threshold})`,
      labels: rule.labels,
      firedAt: now,
      resolvedAt: null,
      acknowledgedAt: null,
    };

    this.firingAlerts.set(rule.name, alert);

    try {
      const db = await getDB();
      await db.put('alerts', alert);
      window.dispatchEvent(new CustomEvent('alert-firing', { detail: alert }));
    } catch {
      // silent
    }
  }

  private resolveAlert(ruleName: string): void {
    const existing = this.firingAlerts.get(ruleName);
    if (!existing || existing.status !== 'firing') return;
    existing.status = 'resolved';
    existing.resolvedAt = Date.now();
    this.firingAlerts.set(ruleName, existing);
    window.dispatchEvent(new CustomEvent('alert-resolved', { detail: existing }));
  }

  acknowledgeAlert(id: string): void {
    for (const [, alert] of this.firingAlerts) {
      if (alert.id === id) {
        alert.status = 'acknowledged';
        alert.acknowledgedAt = Date.now();
        break;
      }
    }
  }

  getFiringAlerts(): FiringAlert[] {
    return Array.from(this.firingAlerts.values()).filter(a => a.status === 'firing');
  }

  getActiveAlerts(): FiringAlert[] {
    return Array.from(this.firingAlerts.values());
  }

  async getAlertHistory(): Promise<FiringAlert[]> {
    try {
      const db = await getDB();
      return await db.getAll('alerts');
    } catch {
      return [];
    }
  }
}

export const alerting = new AlertingEngine();
