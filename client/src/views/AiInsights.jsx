import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

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
                <table className="table w-full">
                    <thead>
                        <tr>
                            <th className="text-left bg-white p-4">Producto</th>
                            <th className="text-right bg-white p-4">Stock Actual</th>
                            <th className="text-right bg-white p-4">Venta Diaria Prom.</th>
                            <th className="text-center bg-white p-4">Se agota en</th>
                            <th className="text-left bg-white p-4">Fecha Estimada</th>
                        </tr>
                    </thead>
                    <tbody>
                        {predictions.map((p, idx) => (
                            <tr key={idx} className="border-t hover:bg-gray-50">
                                <td className="p-4 font-medium">{p.product}</td>
                                <td className="p-4 text-right">{p.stock}</td>
                                <td className="p-4 text-right">{p.dailyAvg}</td>
                                <td className="p-4 text-center">
                                    <span className={`px-2 py-1 rounded font-bold text-xs ${p.daysLeft <= 3 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {p.daysLeft} días
                                    </span>
                                </td>
                                <td className="p-4 text-gray-500">{new Date(p.depletionDate).toLocaleDateString()}</td>
                            </tr>
                        ))}
                        {predictions.length === 0 && (
                            <tr><td colSpan="5" className="p-8 text-center text-gray-400">Tu inventario parece saludable. 👏</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
