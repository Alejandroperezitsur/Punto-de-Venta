import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Table } from '../../components/ui/Table';

export default function MetricsDashboard() {
    const [data, setData] = useState(null);

    useEffect(() => {
        api('/analytics/stats').then(setData).catch(() => { });
    }, []);

    if (!data) return <div className="p-8 text-center text-gray-500">Cargando métricas...</div>;

    const { kpis, recentEvents } = data;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Panel de Métricas SaaS</h1>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <KpiCard label="Tiendas" value={kpis.totalStores} icon="🏪" />
                <KpiCard label="Usuarios" value={kpis.totalUsers} icon="👥" />
                <KpiCard label="Ventas Totales" value={kpis.totalSales} icon="💵" />
                <KpiCard label="Errores" value={kpis.totalErrors} icon="⚠️" color="text-red-500" />
            </div>

            {/* Recent Live Events */}
            <div className="bg-white rounded-lg shadow border p-6">
                <h3 className="font-bold text-gray-700 mb-4">Eventos Recientes</h3>
                <div className="overflow-auto max-h-96">
                    <Table
                        data={recentEvents}
                        searchable={false}
                        pageSize={recentEvents.length || 10}
                        striped={false}
                        density="compact"
                        columns={[
                            { key: 'type', title: 'Evento', render: (ev) => <span className="font-medium text-indigo-600">{ev.type}</span> },
                            { key: 'store_id', title: 'Store ID', render: (ev) => ev.store_id || '-' },
                            { key: 'user_id', title: 'User', render: (ev) => ev.user_id || '-' },
                            { key: 'data', title: 'Data', render: (ev) => <span className="font-mono text-xs text-gray-500 truncate max-w-xs block">{ev.data}</span> },
                            { key: 'created_at', title: 'Tiempo', render: (ev) => <span className="text-gray-400">{new Date(ev.created_at).toLocaleTimeString()}</span> },
                        ]}
                        rowKey={(ev) => ev.id}
                    />
                </div>
            </div>
        </div>
    );
}

function KpiCard({ label, value, icon, color = 'text-gray-900' }) {
    return (
        <div className="bg-white p-6 rounded-lg shadow border flex items-center justify-between">
            <div>
                <div className="text-sm text-gray-500 uppercase font-semibold">{label}</div>
                <div className={`text-3xl font-bold ${color}`}>{value}</div>
            </div>
            <div className="text-3xl">{icon}</div>
        </div>
    );
}
