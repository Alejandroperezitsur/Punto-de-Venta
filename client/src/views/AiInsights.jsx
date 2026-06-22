import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { ViewContainer } from '../components/layout/ViewContainer';
import { ViewHeader } from '../components/layout/ViewHeader';
import { Brain, AlertTriangle, Bell, Package } from 'lucide-react';
import { cn } from '../utils/cn';

export default function AiInsights() {
    const [insights, setInsights] = useState([]);
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api('/ai/insights'),
            api('/ai/inventory')
        ]).then(([ins, preds]) => {
            setInsights(ins);
            setPredictions(preds);
        }).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8 text-center text-muted-foreground">Analizando datos...</div>;

    return (
        <ViewContainer>
            <ViewHeader title="Centro de Inteligencia" icon={<Brain className="size-5 text-primary" />}
                description="Alertas predictivas y recomendaciones para tu negocio" />

            {/* Smart Alerts */}
            {insights.length > 0 && (
                <div className="mb-8 space-y-4">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <Bell className="size-4 text-warning" /> Alertas Activas
                    </h2>
                    {insights.map((ins, idx) => (
                        <Card key={idx} className={cn('p-4 flex gap-4 rounded-2xl border-l-4 backdrop-blur-md bg-surface-glass/50 border border-border/20', ins.priority === 'high' ? 'border-l-danger' : 'border-l-warning')}>
                            <div className="size-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                                {ins.priority === 'high' ? <AlertTriangle className="size-4 text-danger" /> : <Bell className="size-4 text-warning" />}
                            </div>
                            <div>
                                <div className="font-bold text-sm">{ins.title}</div>
                                <div className="text-sm text-muted-foreground">{ins.description}</div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Inventory Predictions */}
            <Card className="p-0 overflow-hidden rounded-2xl backdrop-blur-md bg-surface-glass/50 border border-border/20">
                <div className="p-6 border-b border-border/10">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <Package className="size-4 text-primary" /> Predicción de Inventario
                    </h2>
                    <p className="text-sm text-muted-foreground">Productos que se agotarán pronto basado en tu ritmo de ventas.</p>
                </div>
                <Table
                    data={predictions}
                    searchable={false}
                    pageSize={predictions.length || 10}
                    striped={false}
                    density="compact"
                    emptyTitle="Tu inventario parece saludable."
                    columns={[
                        { key: 'product', label: 'Producto', render: (p) => <span className="font-medium">{p.product}</span> },
                        { key: 'stock', label: 'Stock Actual', className: 'text-right' },
                        { key: 'dailyAvg', label: 'Venta Diaria Prom.', className: 'text-right' },
                        { key: 'daysLeft', label: 'Se agota en', className: 'text-center', render: (p) => (
                            <Badge variant={p.daysLeft <= 3 ? 'danger' : 'warning'} size="sm">
                                {p.daysLeft} días
                            </Badge>
                        )},
                        { key: 'depletionDate', label: 'Fecha Estimada', render: (p) => <span className="text-muted-foreground">{new Date(p.depletionDate).toLocaleDateString()}</span> },
                    ]}
                />
            </Card>
        </ViewContainer>
    );
}
