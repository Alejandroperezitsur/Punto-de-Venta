import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { useToast } from '../components/ui/Toast';
import { ViewContainer } from '../components/layout/ViewContainer';
import { ViewHeader } from '../components/layout/ViewHeader';
import { formatMoney } from '../utils/format';
import { ClipboardList, Search, ArrowUpDown } from 'lucide-react';
import { cn } from '../utils/cn';

const FILTER_MAP = {
  'Todos': null,
  'Ventas': ['sale_create', 'sale_delete'],
  'Usuarios': ['user_create', 'user_update', 'user_delete'],
  'Caja': ['cash_open', 'cash_close', 'cash_withdraw', 'cash_deposit'],
  'Config': ['settings_update'],
};

const AuditsView = () => {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState('desc');
  const [activeFilter, setActiveFilter] = useState('Todos');

  const loadAudits = async () => {
    setLoading(true);
    try {
      const data = await api('/audits');
      setAudits(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudits();
  }, []);

  const filtered = audits.filter(a => {
    const q = search.toLowerCase();
    const matchesSearch = (
      a.action?.toLowerCase().includes(q) ||
      a.entity_type?.toLowerCase().includes(q) ||
      String(a.user_id).includes(q)
    );
    const filterActions = FILTER_MAP[activeFilter];
    const matchesFilter = !filterActions || filterActions.includes(a.action);
    return matchesSearch && matchesFilter;
  });

  const sorted = [...filtered].sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    return sortDir === 'desc' ? tb - ta : ta - tb;
  });

  const getActionBadge = (action) => {
    const colors = {
      sale_create: 'bg-green-100 text-green-700',
      sale_delete: 'bg-red-100 text-red-700',
      user_create: 'bg-blue-100 text-blue-700',
      user_update: 'bg-yellow-100 text-yellow-700',
      user_delete: 'bg-red-100 text-red-700',
      cash_open: 'bg-green-100 text-green-700',
      cash_close: 'bg-purple-100 text-purple-700',
      cash_withdraw: 'bg-orange-100 text-orange-700',
      cash_deposit: 'bg-teal-100 text-teal-700',
      settings_update: 'bg-indigo-100 text-indigo-700',
    };
    return colors[action] || 'bg-gray-100 text-gray-700';
  };

  return (
    <ViewContainer>
      <ViewHeader title="Auditoría del Sistema" icon={<ClipboardList className="size-5 text-primary" />}>
        <Input
          placeholder="Buscar acción, entidad..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={<Search className="size-4" />}
          className="w-64"
        />
        <button
          onClick={() => setSortDir(sortDir === 'desc' ? 'asc' : 'desc')}
          className="p-2 rounded-lg border border-border/35 hover:bg-muted/50 backdrop-blur-sm transition-colors"
          title="Cambiar orden"
        >
          <ArrowUpDown className="h-4 w-4" />
        </button>
      </ViewHeader>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(FILTER_MAP).map(chip => (
          <button
            key={chip}
            onClick={() => setActiveFilter(chip)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
              activeFilter === chip
                ? 'bg-primary/12 border-primary/30 text-primary'
                : 'bg-surface-glass/50 border-border/20 text-muted-foreground hover:border-primary/25 hover:text-foreground'
            )}
          >
            {chip}
          </button>
        ))}
      </div>

      <Card variant="glass" className="p-0 overflow-hidden">
        <Table
          columns={[
            {
              key: 'date',
              label: 'Fecha/Hora',
              render: (row) => (
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()}
                </span>
              ),
            },
            {
              key: 'action',
              label: 'Acción',
              render: (row) => (
                <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${getActionBadge(row.action)}`}>
                  {row.action}
                </span>
              ),
            },
            {
              key: 'entity',
              label: 'Entidad',
              render: (row) => (
                <span className="text-muted-foreground">
                  {row.entity_type} #{row.entity_id}
                </span>
              ),
            },
            {
              key: 'user',
              label: 'Usuario',
              render: (row) => (
                <span className="inline-flex items-center gap-1">
                  <span className="size-5 rounded-full bg-primary/8 flex items-center justify-center text-[9px] font-bold text-primary">{row.user_id}</span>
                </span>
              ),
            },
            {
              key: 'details',
              label: 'Detalles',
              render: (row) => {
                if (!row.details) return '-';
                try {
                  const parsed = typeof row.details === 'string' ? JSON.parse(row.details) : row.details;
                  return (
                    <span className="text-xs text-muted-foreground max-w-xs truncate block">
                      {JSON.stringify(parsed)}
                    </span>
                  );
                } catch {
                  return <span className="text-xs text-muted-foreground max-w-xs truncate block">{row.details}</span>;
                }
              },
            },
          ]}
          data={sorted.slice(0, 100)}
          loading={loading}
          searchable
          searchPlaceholder="Buscar en auditoría..."
          emptyMessage="No se encontraron registros de auditoría"
          emptyIcon={ClipboardList}
        />
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Mostrando los últimos 100 registros
      </p>
    </ViewContainer>
  );
};

export default AuditsView;
