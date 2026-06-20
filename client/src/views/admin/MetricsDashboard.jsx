import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { KpiCard } from '../../components/ui/KpiCard';
import { Table } from '../../components/ui/Table';
import { ViewContainer } from '../../components/layout/ViewContainer';
import { ViewHeader } from '../../components/layout/ViewHeader';
import { BarChart3, Store, Users, DollarSign, AlertTriangle } from 'lucide-react';

export default function MetricsDashboard() {
    const [data, setData] = useState(null);

    useEffect(() => {
        api('/analytics/stats').then(setData).catch(() => { });
    }, []);

    if (!data) return <div className="p-8 text-center text-muted-foreground">Cargando métricas...</div>;

    const { kpis, recentEvents } = data;

    return (
        <ViewContainer>
            <ViewHeader title="Panel de Métricas SaaS" icon={<BarChart3 className="size-5 text-primary" />} />

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <KpiCard label="Tiendas" value={kpis.totalStores} icon={Store} iconColor="primary" />
                <KpiCard label="Usuarios" value={kpis.totalUsers} icon={Users} iconColor="info" />
                <KpiCard label="Ventas Totales" value={kpis.totalSales} icon={DollarSign} iconColor="success" />
                <KpiCard label="Errores" value={kpis.totalErrors} icon={AlertTriangle} iconColor="danger" />
            </div>

            {/* Recent Live Events */}
            <Card className="p-6 rounded-2xl backdrop-blur-md bg-surface-glass/40 border border-white/[0.06]">
                <h3 className="font-bold mb-4">Eventos Recientes</h3>
                <div className="overflow-auto max-h-96">
                    <Table
                        data={recentEvents}
                        searchable={false}
                        pageSize={recentEvents.length || 10}
                        striped={false}
                        density="compact"
                        columns={[
                            { key: 'type', title: 'Evento', render: (ev) => <span className="font-medium text-primary">{ev.type}</span> },
                            { key: 'store_id', title: 'Store ID', render: (ev) => ev.store_id || '-' },
                            { key: 'user_id', title: 'User', render: (ev) => ev.user_id || '-' },
                            { key: 'data', title: 'Data', render: (ev) => <span className="font-mono text-xs text-muted-foreground truncate max-w-xs block">{ev.data}</span> },
                            { key: 'created_at', title: 'Tiempo', render: (ev) => <span className="text-muted-foreground">{new Date(ev.created_at).toLocaleTimeString()}</span> },
                        ]}
                        rowKey={(ev) => ev.id}
                    />
                </div>
            </Card>
        </ViewContainer>
    );
}
