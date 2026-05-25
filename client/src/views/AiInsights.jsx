import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';

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

    if (loading) return <div className="p-8 text-center text-gray-500">Analizando datos... 🧠</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold mb-2">Centro de Inteligencia</h1>
            <p className="text-gray-500 mb-8">Alertas predictivas y recomendaciones para tu negocio.</p>

            {/* Smart Alerts */}
            {insights.length > 0 && (
                <div className="mb-8 space-y-4">
                    <h2 className="font-bold text-lg text-gray-800">🔔 Alertas Activas</h2>
                    {insights.map((ins, idx) => (
                        <div key={idx} className={`p-4 rounded-lg border-l-4 shadow-sm flex gap-4 ${ins.priority === 'high' ? 'bg-red-50 border-red-500 text-red-900' : 'bg-yellow-50 border-yellow-500 text-yellow-900'}`}>
                            <div className="text-2xl">{ins.priority === 'high' ? '⚠️' : '📢'}</div>
                            <div>
                                <div className="font-bold">{ins.title}</div>
                                <div>{ins.description}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Inventory Predictions */}
            <div className="bg-white rounded-lg shadow border overflow-hidden">
                <div className="p-6 border-b bg-gray-50">
                    <h2 className="font-bold text-lg text-gray-800">📦 Predicción de Inventario</h2>
                    <p className="text-sm text-gray-500">Productos que se agotarán pronto basado en tu ritmo de ventas.</p>
                </div>
                <Table
                    data={predictions}
                    searchable={false}
                    pageSize={predictions.length || 10}
                    striped={false}
                    density="compact"
                    emptyTitle="Tu inventario parece saludable."
                    columns={[
                        { key: 'product', title: 'Producto', render: (p) => <span className="font-medium">{p.product}</span> },
                        { key: 'stock', title: 'Stock Actual', className: 'text-right' },
                        { key: 'dailyAvg', title: 'Venta Diaria Prom.', className: 'text-right' },
                        { key: 'daysLeft', title: 'Se agota en', className: 'text-center', render: (p) => (
                            <span className={`px-2 py-1 rounded font-bold text-xs ${p.daysLeft <= 3 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {p.daysLeft} días
                            </span>
                        )},
                        { key: 'depletionDate', title: 'Fecha Estimada', render: (p) => <span className="text-gray-500">{new Date(p.depletionDate).toLocaleDateString()}</span> },
                    ]}
                />
            </div>
        </div>
    );
}
