const express = require('express');
const router = express.Router();
const { auth } = require('./auth');

const DASHBOARDS = {
  operations: {
    title: 'Dashboard de Operaciones',
    refreshInterval: 30,
    panels: [
      { title: 'Ventas/minuto', metric: 'pos_sales_per_minute', type: 'gauge' },
      { title: 'Checkout duration', metric: 'pos_checkout_duration_ms_p95', type: 'gauge' },
      { title: 'Escaneos/minuto', metric: 'pos_scanner_throughput', type: 'gauge' },
      { title: 'Carritos abandonados', metric: 'pos_abandoned_carts', type: 'counter' },
    ],
  },
  offline: {
    title: 'Salud Offline',
    refreshInterval: 10,
    panels: [
      { title: 'Duración offline', metric: 'pos_offline_duration_ms', type: 'histogram' },
      { title: 'Reconexiones', metric: 'pos_reconnect_count', type: 'counter' },
      { title: 'Memory pressure', metric: 'pos_memory_pressure', type: 'gauge' },
    ],
  },
  queue: {
    title: 'Cola de Sincronización',
    refreshInterval: 5,
    panels: [
      { title: 'Queue lag', metric: 'pos_queue_lag', type: 'gauge' },
      { title: 'Retries', metric: 'pos_retry_count', type: 'counter' },
      { title: 'Failed syncs', metric: 'pos_failed_syncs', type: 'counter' },
      { title: 'Sync latency p95', metric: 'pos_sync_latency_ms_p95', type: 'gauge' },
      { title: 'Queue growth rate', metric: 'pos_queue_growth_rate', type: 'gauge' },
    ],
  },
  errors: {
    title: 'Errores Frontend y Backend',
    refreshInterval: 60,
    panels: [
      { title: 'Browser crashes', metric: 'pos_browser_crashes', type: 'counter' },
      { title: 'Payment failures', metric: 'pos_payment_failures', type: 'counter' },
      { title: 'Migration failures', metric: 'pos_migration_failures', type: 'counter' },
    ],
  },
  financial: {
    title: 'Anomalías Financieras',
    refreshInterval: 60,
    panels: [
      { title: 'Cash discrepancy', metric: 'pos_cash_discrepancy', type: 'gauge' },
      { title: 'Inventory conflicts', metric: 'pos_inventory_conflicts', type: 'counter' },
      { title: 'Reconciliation drift', metric: 'pos_reconciliation_drift', type: 'gauge' },
    ],
  },
  inventory: {
    title: 'Drift de Inventario',
    refreshInterval: 30,
    panels: [
      { title: 'Reconciliation drift', metric: 'pos_reconciliation_drift', type: 'gauge' },
      { title: 'Inventory conflicts', metric: 'pos_inventory_conflicts', type: 'counter' },
    ],
  },
  sessions: {
    title: 'Sesiones Activas',
    refreshInterval: 30,
    panels: [
      { title: 'Sesiones activas', metric: 'active_sessions', type: 'gauge' },
    ],
  },
  reconnects: {
    title: 'Reconnect Storms',
    refreshInterval: 10,
    panels: [
      { title: 'Reconexiones', metric: 'pos_reconnect_count', type: 'counter' },
      { title: 'Offline duration', metric: 'pos_offline_duration_ms', type: 'histogram' },
    ],
  },
};

router.get('/:name', auth, (req, res) => {
  const dashboard = DASHBOARDS[req.params.name];
  if (!dashboard) return res.jsonError('Dashboard not found', 404);
  res.jsonResponse(dashboard);
});

router.get('/', auth, (req, res) => {
  res.jsonResponse(Object.keys(DASHBOARDS).map(k => ({ name: k, ...DASHBOARDS[k] })));
});

module.exports = router;
