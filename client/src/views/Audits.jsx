import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Table } from '../components/ui/Table';
import { useToast } from '../components/ui/Toast';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { formatMoney } from '../utils/format';
import { ClipboardList, Search, Calendar, User, ArrowUpDown } from 'lucide-react';
import { motion } from 'framer-motion';

const AuditsView = () => {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState('desc');

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
    return (
      a.action?.toLowerCase().includes(q) ||
      a.entity_type?.toLowerCase().includes(q) ||
      String(a.user_id).includes(q)
    );
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Auditoría del Sistema</h1>
        </div>
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Buscar acción, entidad..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            icon={Search}
            className="w-64"
          />
          <button
            onClick={() => setSortDir(sortDir === 'desc' ? 'asc' : 'desc')}
            className="p-2 rounded-lg border border-border hover:bg-muted"
            title="Cambiar orden"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table
          columns={[
            {
              key: 'date',
              title: 'Fecha/Hora',
              render: (row) => (
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()}
                </span>
              ),
            },
            {
              key: 'action',
              title: 'Acción',
              render: (row) => (
                <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${getActionBadge(row.action)}`}>
                  {row.action}
                </span>
              ),
            },
            {
              key: 'entity',
              title: 'Entidad',
              render: (row) => (
                <span className="text-muted-foreground">
                  {row.entity_type} #{row.entity_id}
                </span>
              ),
            },
            {
              key: 'user',
              title: 'Usuario',
              render: (row) => (
                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {row.user_id}
                </span>
              ),
            },
            {
              key: 'details',
              title: 'Detalles',
              render: (row) => (
                <span className="text-xs text-muted-foreground max-w-xs truncate block">
                  {row.details ? JSON.stringify(JSON.parse(row.details)) : '-'}
                </span>
              ),
            },
          ]}
          data={sorted.slice(0, 100)}
          loading={loading}
          searchable
          searchPlaceholder="Buscar en auditoría..."
          emptyMessage="No se encontraron registros de auditoría"
          emptyIcon={<ClipboardList className="size-12" />}
        />
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Mostrando los últimos 100 registros
      </p>
    </div>
  );
};

export default AuditsView;
