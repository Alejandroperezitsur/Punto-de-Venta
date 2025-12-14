import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Subscription() {
    const [sub, setSub] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api('/billing/current').then(setSub).catch(() => { });
    }, []);

    const handleUpgrade = async (planId) => {
        if (!confirm('¿Confirmar simulación de pago?')) return;
        setLoading(true);
        try {
            const res = await api('/billing/checkout', {
                method: 'POST',
                body: JSON.stringify({ planId })
            });
            if (res.success) {
                setSub(res.subscription);
                alert('¡Pago exitoso! Plan actualizado.');
            }
        } catch (e) {
            alert('Error en pago');
        } finally {
            setLoading(false);
        }
    };

    if (!sub) return <div className="p-8">Cargando...</div>;

    const PlanCard = ({ id, name, price, current }) => (
        <div className={`border rounded-lg p-6 ${current ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'bg-white'}`}>
            <h3 className="font-bold text-lg">{name}</h3>
            <div className="text-2xl font-bold my-2">${price} <span className="text-sm font-normal text-gray-500">/mes</span></div>
            {current ? (
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded inline-block text-sm font-medium mt-4">Plan Actual</div>
            ) : (
                <button
                    onClick={() => handleUpgrade(id)}
                    disabled={loading}
                    className="w-full mt-4 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                    {loading ? 'Procesando...' : 'Seleccionar'}
                </button>
            )}
        </div>
    );

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-2">Suscripción y Facturación</h1>
            <p className="text-gray-500 mb-8">Administra el plan de tu negocio.</p>

            <div className="grid md:grid-cols-3 gap-6">
                <PlanCard id="free" name="Emprendedor" price="0" current={sub.plan_id === 'free'} />
                <PlanCard id="pro" name="Negocio Pro" price="499" current={sub.plan_id === 'pro'} />
                <PlanCard id="enterprise" name="Enterprise" price="1499" current={sub.plan_id === 'enterprise'} />
            </div>

            <div className="mt-12">
                <h3 className="font-bold mb-4">Método de Pago</h3>
                <div className="bg-white p-6 rounded border flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="text-2xl">💳</div>
                        <div>
                            <div className="font-medium">•••• •••• •••• 4242</div>
                            <div className="text-sm text-gray-500">Expira 12/28</div>
                        </div>
                    </div>
                    <button className="text-indigo-600 font-medium hover:underline">Cambiar tarjeta</button>
                </div>
            </div>
        </div>
    );
}
