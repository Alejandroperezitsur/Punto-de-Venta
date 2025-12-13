import React, { useState } from 'react';
import { api } from '../../lib/api';

export function PaymentModal({ amount, onClose, onConfirm }) {
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    const handlePay = async () => {
        setProcessing(true);
        setError(null);
        try {
            // 1. Create Intent
            const intent = await api.post('/payments/create-intent', { amount });

            // 2. Simulate User entering card details and confirming...
            await new Promise(r => setTimeout(r, 1500)); // Simulate UI interaction

            // 3. Confirm
            const res = await api.post('/payments/confirm', {
                paymentId: intent.id
            });

            if (res.success) {
                onConfirm({ method: 'card_online', amount: amount, reference: res.paymentId });
            }
        } catch (e) {
            setError(e.message || 'Error en el pago');
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                <h2 className="text-xl font-bold mb-4">Pago con Tarjeta</h2>
                <div className="mb-4">
                    <p className="text-gray-600">Total a pagar:</p>
                    <p className="text-3xl font-bold text-gray-900">${amount.toFixed(2)}</p>
                </div>

                {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded text-sm">{error}</div>}

                <div className="bg-gray-50 p-4 rounded border mb-4">
                    <div className="h-4 w-full bg-gray-200 rounded mb-2 animate-pulse"></div>
                    <div className="flex gap-2">
                        <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <p className="text-xs text-center text-gray-500 mt-2">(Simulación de Pasarela Segura)</p>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} disabled={processing} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                    <button
                        onClick={handlePay}
                        disabled={processing}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                    >
                        {processing && <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {processing ? 'Procesando...' : 'Pagar Ahora'}
                    </button>
                </div>
            </div>
        </div>
    );
}
