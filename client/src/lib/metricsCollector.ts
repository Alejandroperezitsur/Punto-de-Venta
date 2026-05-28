import { getDB } from './db';

export interface MetricPoint {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

export interface MetricDefinition {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  labels: string[];
  buckets?: number[];
}

class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private summaries: Map<string, number[]> = new Map();
  private readonly maxSummarySize = 100;
  private readonly maxHistogramSize = 1000;
  private readonly flushIntervalMs = 30000;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private memoryTimer: ReturnType<typeof setInterval> | null = null;
  private offlineCleanupFns: Array<() => void> = [];

  readonly definitions: MetricDefinition[] = [
    { name: 'pos_sales_per_minute', help: 'Sales completed per minute', type: 'gauge', labels: ['store_id'] },
    { name: 'pos_sync_latency_ms', help: 'Sync latency in milliseconds', type: 'histogram', labels: ['type'], buckets: [100, 500, 1000, 3000, 5000, 10000] },
    { name: 'pos_queue_lag', help: 'Queue items pending processing', type: 'gauge', labels: ['priority'] },
    { name: 'pos_retry_count', help: 'Number of retries', type: 'counter', labels: ['type'] },
    { name: 'pos_failed_syncs', help: 'Failed sync operations', type: 'counter', labels: ['type'] },
    { name: 'pos_inventory_conflicts', help: 'Inventory version conflicts', type: 'counter', labels: ['store_id'] },
    { name: 'pos_reconciliation_drift', help: 'Reconciliation drift detected', type: 'gauge', labels: ['store_id'] },
    { name: 'pos_payment_failures', help: 'Payment processing failures', type: 'counter', labels: ['method'] },
    { name: 'pos_cash_discrepancy', help: 'Cash drawer discrepancies', type: 'gauge', labels: ['store_id'] },
    { name: 'pos_offline_duration_ms', help: 'Duration of offline periods', type: 'gauge', labels: [] },
    { name: 'pos_reconnect_count', help: 'Reconnect events', type: 'counter', labels: [] },
    { name: 'pos_indexeddb_latency_ms', help: 'IndexedDB operation latency', type: 'histogram', labels: ['operation'], buckets: [5, 10, 50, 100, 500] },
    { name: 'pos_memory_usage_mb', help: 'Browser memory usage', type: 'gauge', labels: ['type'] },
    { name: 'pos_scanner_throughput', help: 'Scanner reads per minute', type: 'gauge', labels: [] },
    { name: 'pos_checkout_duration_ms', help: 'Checkout completion time', type: 'histogram', labels: ['method'], buckets: [1000, 3000, 5000, 10000, 30000] },
    { name: 'pos_abandoned_carts', help: 'Abandoned carts', type: 'counter', labels: [] },
    { name: 'pos_queue_growth_rate', help: 'Queue items added per minute', type: 'gauge', labels: [] },
    { name: 'pos_browser_crashes', help: 'Browser crash events', type: 'counter', labels: [] },
    { name: 'pos_memory_pressure', help: 'deviceMemory below threshold', type: 'gauge', labels: [] },
    { name: 'pos_migration_failures', help: 'Failed IndexedDB migrations', type: 'counter', labels: [] },
  ];

  start(): void {
    this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
    this.startMemoryMonitoring();
    this.startOfflineMonitoring();
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.memoryTimer) {
      clearInterval(this.memoryTimer);
      this.memoryTimer = null;
    }
    this.offlineCleanupFns.forEach(fn => fn());
    this.offlineCleanupFns = [];
  }

  // Counter
  incrementCounter(name: string, labels: Record<string, string> = {}, value = 1): void {
    const key = this.encodeKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  }

  // Gauge
  setGauge(name: string, labels: Record<string, string> = {}, value: number): void {
    const key = this.encodeKey(name, labels);
    this.gauges.set(key, value);
  }

  // Histogram
  observeHistogram(name: string, labels: Record<string, string> = {}, value: number): void {
    const key = this.encodeKey(name, labels);
    const bucket = this.histograms.get(key) || [];
    bucket.push(value);
    if (bucket.length > 1000) bucket.shift();
    this.histograms.set(key, bucket);
  }

  // Summary
  observeSummary(name: string, labels: Record<string, string> = {}, value: number): void {
    const key = this.encodeKey(name, labels);
    const bucket = this.summaries.get(key) || [];
    bucket.push(value);
    if (bucket.length > this.maxSummarySize) bucket.shift();
    this.summaries.set(key, bucket);
  }

  getMetric(name: string, labels: Record<string, string> = {}): number | null {
    const key = this.encodeKey(name, labels);
    if (this.counters.has(key)) return this.counters.get(key)!;
    if (this.gauges.has(key)) return this.gauges.get(key)!;
    const h = this.histograms.get(key);
    if (h && h.length > 0) return h.reduce((a, b) => a + b, 0) / h.length;
    return null;
  }

  getAllMetrics(): MetricPoint[] {
    const points: MetricPoint[] = [];
    const now = Date.now();

    for (const [key, value] of this.counters) {
      const { name, labels } = this.decodeKey(key);
      points.push({ name, value, labels, timestamp: now });
    }
    for (const [key, value] of this.gauges) {
      const { name, labels } = this.decodeKey(key);
      points.push({ name, value, labels, timestamp: now });
    }
    for (const [key, values] of this.histograms) {
      if (values.length === 0) continue;
      const { name, labels } = this.decodeKey(key);
      values.sort((a, b) => a - b);
      const p50 = values[Math.floor(values.length * 0.5)];
      const p95 = values[Math.floor(values.length * 0.95)];
      const p99 = values[Math.floor(values.length * 0.99)];
      points.push({ name: `${name}_p50`, value: p50, labels, timestamp: now });
      points.push({ name: `${name}_p95`, value: p95, labels, timestamp: now });
      points.push({ name: `${name}_p99`, value: p99, labels, timestamp: now });
      points.push({ name: `${name}_count`, value: values.length, labels, timestamp: now });
    }
    return points;
  }

  private async flush(): Promise<void> {
    try {
      const db = await getDB();
      const points = this.getAllMetrics();
      if (points.length === 0) return;
      const tx = db.transaction('metrics', 'readwrite');
      for (const p of points) {
        await tx.store.put({ ...p, id: `${p.name}_${p.timestamp}_${Math.random().toString(36).slice(2, 6)}` });
      }
      await tx.done;
    } catch {
      // silent flush failure
    }
  }

  private startMemoryMonitoring(): void {
    if ('memory' in performance && (performance as any).memory) {
      this.memoryTimer = setInterval(() => {
        const mem = (performance as any).memory;
        this.setGauge('pos_memory_usage_mb', { type: 'js' }, Math.round(mem.usedJSHeapSize / 1048576));
        this.setGauge('pos_memory_usage_mb', { type: 'total' }, Math.round(mem.totalJSHeapSize / 1048576));
        if (mem.usedJSHeapSize / mem.totalJSHeapSize > 0.9) {
          this.setGauge('pos_memory_pressure', {}, 1);
        }
      }, 10000);
    }
    if ('deviceMemory' in navigator) {
      const dm = (navigator as any).deviceMemory;
      if (dm && dm < 2) {
        this.setGauge('pos_memory_pressure', {}, 1);
      }
    }
  }

  private startOfflineMonitoring(): void {
    let offlineStart: number | null = null;
    const onOffline = () => { offlineStart = Date.now(); };
    const onOnline = () => {
      if (offlineStart) {
        this.observeHistogram('pos_offline_duration_ms', {}, Date.now() - offlineStart);
        this.incrementCounter('pos_reconnect_count');
        offlineStart = null;
      }
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    this.offlineCleanupFns.push(
      () => window.removeEventListener('offline', onOffline),
      () => window.removeEventListener('online', onOnline),
    );
  }

  private encodeKey(name: string, labels: Record<string, string>): string {
    const sorted = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    return `${name}{${sorted.map(([k, v]) => `${k}="${v}"`).join(',')}}`;
  }

  private decodeKey(key: string): { name: string; labels: Record<string, string> } {
    const brace = key.indexOf('{');
    if (brace === -1) return { name: key, labels: {} };
    const name = key.slice(0, brace);
    const inner = key.slice(brace + 1, -1);
    const labels: Record<string, string> = {};
    if (inner) {
      for (const pair of inner.split(',')) {
        const [k, v] = pair.split('=');
        labels[k] = v.replace(/"/g, '');
      }
    }
    return { name, labels };
  }
}

export const metrics = new MetricsCollector();

export function getAllMetrics(): MetricPoint[] {
  return metrics.getAllMetrics();
}
