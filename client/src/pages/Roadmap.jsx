import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Footer } from '../components/layout/Footer';
import { Link } from 'react-router-dom';

export function Roadmap() {
    const [features, setFeatures] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api('/roadmap').then(setFeatures).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const handleVote = async (feature_name) => {
        try {
            await api('/roadmap/vote', { method: 'POST', body: JSON.stringify({ feature_name }) });
            // Optimistic update
            setFeatures(prev => prev.map(f =>
                f.feature_name === feature_name ? { ...f, votes: f.votes + 1 } : f
            ));
        } catch (e) {
            alert('Error al votar');
        }
    };

    const StatusColumn = ({ title, status, items, color }) => (
        <div className="bg-gray-50 rounded-lg p-4">
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${color}`}>
                <span className={`w-3 h-3 rounded-full ${color.replace('text', 'bg').replace('700', '500')}`}></span>
                {title}
            </h3>
            <div className="space-y-4">
                {items.map(f => (
                    <div key={f.feature_name} className="bg-white p-4 rounded shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start">
                            <h4 className="font-semibold text-gray-900">{f.feature_name}</h4>
                            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                                {f.votes} ▲
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{f.description}</p>
                        {status === 'planned' && (
                            <button
                                onClick={() => handleVote(f.feature_name)}
                                className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50 w-full"
                            >
                                ▲ Votar
                            </button>
                        )}
                    </div>
                ))}
                {items.length === 0 && <p className="text-gray-400 text-sm text-center italic">Nada por aquí...</p>}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white">
            <nav className="border-b bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link to="/" className="text-2xl font-bold text-indigo-600">Ventify</Link>
                    <Link to="/landing" className="text-gray-500">Volver</Link>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-gray-900">Roadmap Público</h1>
                    <p className="text-gray-500 mt-2">Ayúdanos a decidir qué construir después.</p>
                </div>

                {loading ? (
                    <div className="text-center text-gray-500">Cargando...</div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-6">
                        <StatusColumn
                            title="Planeado"
                            status="planned"
                            items={features.filter(f => f.status === 'planned')}
                            color="text-gray-700"
                        />
                        <StatusColumn
                            title="En Progreso"
                            status="in_progress"
                            items={features.filter(f => f.status === 'in_progress')}
                            color="text-blue-700"
                        />
                        <StatusColumn
                            title="Completado"
                            status="completed"
                            items={features.filter(f => f.status === 'completed')}
                            color="text-green-700"
                        />
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}
