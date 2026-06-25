import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { KpiCard } from '../components/ui/KpiCard';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { api } from '../lib/api';
import { formatMoney } from '../utils/format';
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function ReportesView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'general' | 'sales' | 'products'>('general');
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, salesRes, topRes] = await Promise.all([
        api('/reports/summary'),
        api('/reports/sales?days=30'),
        api('/reports/top-products?limit=5'),
      ]);
      setData({
        summary: statsRes,
        sales: Array.isArray(salesRes) ? salesRes : salesRes.data || [],
        topProducts: Array.isArray(topRes) ? topRes : topRes.data || [],
      });
    } catch {
      // Generate sample data for demo
      setData(generateSampleData());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Reportes" description="Analitica de tu negocio" icon={BarChart3} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[1,2,3,4].map(i => <Skeleton key={i} variant="card" className="h-[120px]" />)}
        </div>
        <Skeleton variant="chart" />
      </div>
    );
  }

  const summary = data?.summary || {};
  const salesData = data?.sales || [];
  const topProducts = data?.topProducts || [];

  const TABS = [
    { key: 'general' as const, label: 'General' },
    { key: 'sales' as const, label: 'Ventas' },
    { key: 'products' as const, label: 'Productos' },
  ];

  return (
    <div>
      <PageHeader
        title="Reportes"
        description="Analitica de tu negocio"
        icon={BarChart3}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
              tab === t.key
                ? 'bg-action-primary text-[var(--bg-surface)]'
                : 'text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Ventas del Mes" value={formatMoney(summary.monthSales || 0)} trend={{ value: 12, positive: true }} />
        <KpiCard label="Ticket Promedio" value={formatMoney(summary.avgTicket || 0)} />
        <KpiCard label="Total Transacciones" value={String(summary.totalTransactions || 0)} trend={{ value: 8, positive: true }} />
        <KpiCard label="Productos Vendidos" value={String(summary.totalItems || 0)} />
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Sales Chart */}
        <div className="rounded-lg bg-bg-surface border border-border-subtle p-5">
          <h3 className="text-sm font-bold text-text-primary mb-4">Ventas Diarias (30 dias)</h3>
          {salesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="total" fill="var(--action-primary)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-tertiary text-center py-12">Sin datos de ventas</p>
          )}
        </div>

        {/* Top Products */}
        <div className="rounded-lg bg-bg-surface border border-border-subtle p-5">
          <h3 className="text-sm font-bold text-text-primary mb-4">Productos Mas Vendidos</h3>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-text-tertiary w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{p.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-bg-inset overflow-hidden">
                        <div className="h-full rounded-full bg-action-primary" style={{ width: `${Math.min(((p.sales_count || 0) / (topProducts[0]?.sales_count || 1)) * 100, 100)}%` }} />
                      </div>
                      <span className="text-xs text-text-tertiary tabular-nums">{p.sales_count || 0} vendidos</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-text-primary tabular-nums">{formatMoney(p.total || 0)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-tertiary text-center py-12">Sin datos de productos</p>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="rounded-lg bg-bg-surface border border-border-subtle p-5">
        <h3 className="text-sm font-bold text-text-primary mb-4">Resumen de Negocio</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Margen</p>
            <p className="text-lg font-bold text-text-primary tabular-nums">{summary.margin || '30'}%</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Ganancia Est.</p>
            <p className="text-lg font-bold text-success-text tabular-nums">{formatMoney(summary.estimatedProfit || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Efectivo</p>
            <p className="text-lg font-bold text-text-primary tabular-nums">{formatMoney(summary.cashAmount || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Tarjeta/Transf.</p>
            <p className="text-lg font-bold text-text-primary tabular-nums">{formatMoney(summary.cardAmount || 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateSampleData() {
  const sales = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    sales.push({
      date: d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
      total: Math.floor(Math.random() * 5000) + 500,
    });
  }
  return {
    summary: {
      monthSales: sales.reduce((a, s) => a + s.total, 0),
      avgTicket: Math.floor(sales.reduce((a, s) => a + s.total, 0) / sales.length),
      totalTransactions: Math.floor(Math.random() * 50) + 20,
      totalItems: Math.floor(Math.random() * 200) + 50,
      margin: 30,
      estimatedProfit: Math.floor(sales.reduce((a, s) => a + s.total, 0) * 0.3),
      cashAmount: Math.floor(sales.reduce((a, s) => a + s.total, 0) * 0.7),
      cardAmount: Math.floor(sales.reduce((a, s) => a + s.total, 0) * 0.3),
    },
    sales,
    topProducts: [
      { name: 'Producto A', sales_count: 45, total: 4500 },
      { name: 'Producto B', sales_count: 32, total: 3200 },
      { name: 'Producto C', sales_count: 28, total: 1400 },
      { name: 'Producto D', sales_count: 20, total: 2000 },
      { name: 'Producto E', sales_count: 15, total: 750 },
    ],
  };
}
