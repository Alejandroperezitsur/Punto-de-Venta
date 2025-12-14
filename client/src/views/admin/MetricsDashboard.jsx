import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

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
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 sticky top-0">
                            <tr>
                                <th className="p-3">Evento</th>
                                <th className="p-3">Store ID</th>
                                <th className="p-3">User</th>
                                <th className="p-3">Data</th>
                                <th className="p-3">Tiempo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {recentEvents.map(ev => (
                                <tr key={ev.id} className="hover:bg-gray-50">
                                    <td className="p-3 font-medium text-indigo-600">{ev.type}</td>
                                    <td className="p-3">{ev.store_id || '-'}</td>
                                    <td className="p-3">{ev.user_id || '-'}</td>
                                    <td className="p-3 font-mono text-xs text-gray-500 truncate max-w-xs">{ev.data}</td>
                                    <td className="p-3 text-gray-400">{new Date(ev.created_at).toLocaleTimeString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
