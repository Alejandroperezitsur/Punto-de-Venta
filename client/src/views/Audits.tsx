import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Column } from '../components/ui/Table';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import { api } from '../lib/api';
import { ClipboardList } from 'lucide-react';

export default function AuditsView() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/audits');
      setLogs(Array.isArray(data) ? data : data.data || []);
    } catch { toast(t('audits.loadError'), 'error'); }
    finally { setLoading(false); }
  }, [toast, t]);

  useEffect(() => { load(); }, [load]);

  const filteredLogs = useMemo(() => {
    if (!filter) return logs;
    return logs.filter(l => l.action?.includes(filter) || l.entity_type?.includes(filter));
  }, [logs, filter]);

  const filters = [
    { key: '', label: t('audits.all') },
    { key: 'sale', label: t('audits.sales') },
    { key: 'create', label: t('audits.creation') },
    { key: 'delete', label: t('audits.deletion') },
    { key: 'auth', label: t('audits.access') },
  ];

  const columns: Column<any>[] = useMemo(() => [
    { key: 'action', label: t('audits.action'), render: l => <span className="font-semibold text-sm">{l.action}</span> },
    { key: 'entity_type', label: t('audits.entity'), hideOnMobile: true },
    { key: 'details', label: t('audits.description'), hideOnMobile: true, render: l => <span className="text-xs text-text-tertiary">{l.details?.slice(0, 80)}</span> },
    { key: 'user_id', label: t('audits.user'), render: l => <span className="text-xs font-medium">{l.user_id}</span> },
    { key: 'created_at', label: t('audits.date'), render: l => new Date(l.created_at).toLocaleString() },
  ], [t]);

  return (
    <div>
      <PageHeader title={t('audits.title')} description={t('audits.description')} icon={ClipboardList} />
      <div className="flex gap-1 mb-4 flex-wrap">
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${filter === f.key ? 'bg-action-primary text-[var(--bg-surface)]' : 'bg-bg-inset text-text-secondary hover:text-text-primary'}`}>
            {f.label}
          </button>
        ))}
      </div>
      <Table columns={columns} data={filteredLogs} keyExtractor={l => String(l.id)} loading={loading} emptyMessage={t('audits.noRecords')} density="comfortable" />
    </div>
  );
}
