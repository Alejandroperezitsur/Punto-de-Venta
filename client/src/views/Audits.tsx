import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Column } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import { api } from '../lib/api';
import { ClipboardList } from 'lucide-react';

export default function AuditsView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/audits');
      setLogs(Array.isArray(data) ? data : data.data || []);
    } catch { toast('Error al cargar auditoria', 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filteredLogs = useMemo(() => {
    if (filter === 'all') return logs;
    return logs.filter(l => l.action?.includes(filter) || l.entity === filter);
  }, [logs, filter]);

  const actionColors: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'neutral'> = {
    create: 'success',
    update: 'info',
    delete: 'danger',
    login: 'info',
    logout: 'neutral',
    open: 'success',
    close: 'warning',
    sale: 'success',
  };

  const FILTERS = [
    { key: 'all', label: 'Todos' },
    { key: 'sale', label: 'Ventas' },
    { key: 'create', label: 'Creacion' },
    { key: 'delete', label: 'Eliminacion' },
    { key: 'login', label: 'Accesos' },
  ];

  const columns: Column<any>[] = useMemo(() => [
    { key: 'action', label: 'Accion', render: l => (
      <Badge variant={actionColors[l.action] || 'neutral'} size="xs">{l.action || 'unknown'}</Badge>
    )},
    { key: 'entity', label: 'Entidad', render: l => <span className="text-sm font-medium">{l.entity || '-'}</span> },
    { key: 'description', label: 'Descripcion', render: l => <span className="text-text-secondary text-sm">{l.description || l.details || '-'}</span> },
    { key: 'user', label: 'Usuario', render: l => <span className="font-semibold text-sm">{l.user?.username || l.username || '-'}</span> },
    { key: 'created_at', label: 'Fecha', hideOnMobile: true, render: l => l.created_at ? new Date(l.created_at).toLocaleString() : '-' },
  ], []);

  return (
    <div>
      <PageHeader title="Auditoria" description="Registro de acciones del sistema" icon={ClipboardList} />

      {/* Filter pills */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-150 ${
              filter === f.key
                ? 'bg-action-primary text-[var(--bg-surface)]'
                : 'text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover border border-border-subtle'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Table
        columns={columns}
        data={filteredLogs}
        keyExtractor={l => String(l.id)}
        loading={loading}
        emptyMessage="No hay registros de auditoria"
        density="comfortable"
      />
    </div>
  );
}
