import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { formatMoney } from '../utils/format';
import { downloadCsv, exportToExcelHTML } from '../utils/exports';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Download, Calendar, DollarSign, TrendingUp, ShoppingBag } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const ReportesView = () => {
  const [range, setRange] = useState('week'); // today, week, month, custom
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState({ total: 0, count: 0, avg: 0 });

  // Derived Data for Charts
  const chartData = useMemo(() => {
    // Group by Date for Line Chart
    const grouped = {};
    sales.forEach(s => {
      const date = s.created_at.split('T')[0];
      grouped[date] = (grouped[date] || 0) + s.total;
    });
    return Object.keys(grouped).map(date => ({ date, total: grouped[date] })).sort((a, b) => a.date.localeCompare(b.date));
  }, [sales]);

  const paymentData = useMemo(() => {
    const counts = {};
    sales.forEach(s => {
      const method = s.payment_method === 'mixed' ? 'Mixto' : (
        s.payment_method === 'cash' ? 'Efectivo' :
          s.payment_method === 'card' ? 'Tarjeta' :
            s.payment_method === 'transfer' ? 'Transferencia' : s.payment_method
      );
      counts[method] = (counts[method] || 0) + s.total;
    });
    return Object.keys(counts).map(name => ({ name, value: counts[name] }));
  }, [sales]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Determine dates
      const now = new Date();
      let from = new Date(now);
      let to = new Date(now);

      if (range === 'today') {
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
      } else if (range === 'week') {
        from.setDate(now.getDate() - 7);
      } else if (range === 'month') {
        from.setDate(1);
      } else if (range === 'custom') {
        from = new Date(customStart);
        to = new Date(customEnd);
        to.setHours(23, 59, 59, 999);
      }

      const fromStr = from.toISOString();
      const toStr = to.toISOString();

      // Fetch Sales
      // We use the simpler /sales endpoint and filter client-side or use params if backend supported
      // Assuming current /sales returns all? Or last 50? 
      // Ideally backend supports params. The old code used /sales and filtered.
      // Let's rely on /sales for now and maybe backend needs update if too slow.
      // Actually old code had /reports/summary with params. Let's use that for totals.

      const [sum, list] = await Promise.all([
        api(`/reports/summary?from=${fromStr}&to=${toStr}`),
        api('/sales') // This might be heavy if all sales. But okay for now.
      ]);

      // Filter list client side for charts (since /sales returns all or limit)
      const filteredList = list.filter(s => {
        const t = s.created_at;
        return t >= fromStr && t <= toStr;
      });

      setSales(filteredList);
      setSummary({
        count: sum.count || filteredList.length,
        total: sum.total || filteredList.reduce((acc, s) => acc + s.total, 0),
        avg: (sum.total / sum.count) || 0
      });

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (range !== 'custom' || (customStart && customEnd)) {
      loadData();
    }
  }, [range, customStart, customEnd]);

  const handleExport = () => {
    const rows = sales.map(s => ({
      id: s.id,
      fecha: new Date(s.created_at).toLocaleString(),
      total: s.total,
      metodo: s.payment_method
    }));
    downloadCsv(rows, { id: 'ID', fecha: 'Fecha', total: 'Total', metodo: 'Método' }, 'ventas.csv');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold">Reportes y Estadísticas</h1>

        <div className="flex flex-wrap gap-2 items-center bg-[hsl(var(--card))] p-1 rounded-lg border border-[hsl(var(--border))]">
          <Button variant={range === 'today' ? 'default' : 'ghost'} size="sm" onClick={() => setRange('today')}>Hoy</Button>
          <Button variant={range === 'week' ? 'default' : 'ghost'} size="sm" onClick={() => setRange('week')}>Semana</Button>
          <Button variant={range === 'month' ? 'default' : 'ghost'} size="sm" onClick={() => setRange('month')}>Mes</Button>
          <Button variant={range === 'custom' ? 'default' : 'ghost'} size="sm" onClick={() => setRange('custom')}>Custom</Button>
        </div>
      </div>

      {range === 'custom' && (
        <Card className="p-4 flex flex-wrap gap-4 items-end animate-fade-in">
          <div>
            <label className="text-xs font-medium block mb-1">Desde</label>
            <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">Hasta</label>
            <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
          </div>
          <Button onClick={loadData} isLoading={loading}>Actualizar</Button>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 flex items-center gap-4 border-l-4 border-l-blue-500">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Ventas Totales</p>
            <h3 className="text-2xl font-bold">{formatMoney(summary.total)}</h3>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-4 border-l-4 border-l-green-500">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Cantidad Ventas</p>
            <h3 className="text-2xl font-bold">{summary.count}</h3>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-4 border-l-4 border-l-purple-500">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Ticket Promedio</p>
            <h3 className="text-2xl font-bold">{formatMoney(summary.count ? summary.total / summary.count : 0)}</h3>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 flex flex-col h-[400px]">
          <h3 className="text-lg font-semibold mb-4">Tendencia de Ventas</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(str) => new Date(str).getDate()}
                />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value) => [formatMoney(value), 'Ventas']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Area type="monotone" dataKey="total" stroke="#8884d8" fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[hsl(var(--muted-foreground))]">
              No hay datos para mostrar
            </div>
          )}
        </Card>

        <Card className="p-6 flex flex-col h-[400px]">
          <h3 className="text-lg font-semibold mb-4">Métodos de Pago</h3>
          {paymentData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatMoney(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[hsl(var(--muted-foreground))]">
              No hay datos para mostrar
            </div>
          )}
        </Card>
      </div>

      {/* Export Actions (Simple for now, expandable) */}
      <div className="flex justify-end">
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" /> Exportar CSV
        </Button>
      </div>
    </div>
  );
};

export default ReportesView;
