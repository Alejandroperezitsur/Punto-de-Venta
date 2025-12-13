import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { formatMoney } from '../utils/format';
import { ClipboardList, Search, Calendar, User, ArrowUpDown } from 'lucide-react';

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
          <ClipboardList className="h-6 w-6 text-[hsl(var(--primary))]" />
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
            className="p-2 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
            title="Cambiar orden"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">Cargando registros...</div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">No hay registros de auditoría</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[hsl(var(--muted))]">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Fecha/Hora</th>
                  <th className="text-left px-6 py-3 font-medium">Acción</th>
                  <th className="text-left px-6 py-3 font-medium">Entidad</th>
                  <th className="text-left px-6 py-3 font-medium">Usuario</th>
                  <th className="text-left px-6 py-3 font-medium">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {sorted.slice(0, 100).map(a => (
                  <tr key={a.id} className="hover:bg-[hsl(var(--muted))/0.5]">
                    <td className="px-6 py-3 font-mono text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${getActionBadge(a.action)}`}>
                        {a.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-[hsl(var(--muted-foreground))]">
                      {a.entity_type} #{a.entity_id}
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {a.user_id}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-[hsl(var(--muted-foreground))] max-w-xs truncate">
                      {a.details ? JSON.stringify(JSON.parse(a.details)) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
        Mostrando los últimos 100 registros
      </p>
    </div>
  );
};

export default AuditsView;
