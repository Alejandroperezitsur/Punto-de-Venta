import React, { useMemo, useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'card', label: 'Tarjeta' },
    { value: 'transfer', label: 'Transferencia' },
    { value: 'credit', label: 'Crédito' },
    { value: 'mixed', label: 'Pago Mixto' }
];

export function PaymentModal({ total, onClose, onConfirm, isLoading }) {
    const [method, setMethod] = useState('cash');
    const [amount, setAmount] = useState(total);
    const [payments, setPayments] = useState([{ method: 'cash', amount: total }]);
    const [error, setError] = useState('');

    const totalMixed = useMemo(() => {
        return payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    }, [payments]);

    const handleConfirm = () => {
        setError('');

        if (method === 'mixed') {
            const normalized = payments
                .map(p => ({ method: p.method, amount: parseFloat(p.amount) || 0 }))
                .filter(p => p.amount > 0);

            if (normalized.length === 0) {
                setError('Agrega al menos un pago válido');
                return;
            }

            onConfirm({ method: 'mixed', payments: normalized });
            return;
        }

        const normalizedAmount = parseFloat(amount);
        if (!normalizedAmount || normalizedAmount <= 0) {
            setError('Monto inválido');
            return;
        }

        onConfirm({ method, payments: [{ method, amount: normalizedAmount }] });
    };

    const updatePayment = (index, key, value) => {
        setPayments(prev => prev.map((p, i) => i === index ? { ...p, [key]: value } : p));
    };

    const addPayment = () => {
        setPayments(prev => [...prev, { method: 'card', amount: 0 }]);
    };

    const removePayment = (index) => {
        setPayments(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--card-bg)] text-[var(--text)] rounded-xl p-6 max-w-md w-full border border-[hsl(var(--border))] shadow-lg">
                <h2 className="text-xl font-bold mb-4">Cobro</h2>
                <div className="mb-4">
                    <p className="text-sm text-[var(--muted-foreground)]">Total a pagar</p>
                    <p className="text-3xl font-bold">${total.toFixed(2)}</p>
                </div>

                <div className="mb-4">
                    <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-2">Método de pago</label>
                    <div className="flex flex-wrap gap-2">
                        {PAYMENT_METHODS.map(m => (
                            <button
                                key={m.value}
                                onClick={() => setMethod(m.value)}
                                className={`px-3 py-2 rounded-lg border text-sm ${method === m.value ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[var(--text)] hover:bg-[var(--bg-muted)]'}`}
                                type="button"
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {method !== 'mixed' && (
                    <div className="mb-4">
                        <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-2">Monto</label>
                        <Input
                            type="number"
                            value={amount}
                            min="0"
                            step="0.01"
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                )}

                {method === 'mixed' && (
                    <div className="mb-4 space-y-3">
                        {payments.map((p, i) => (
                            <div key={`${p.method}-${i}`} className="flex gap-2 items-center">
                                <select
                                    className="h-10 rounded-lg border border-[hsl(var(--border))] bg-[var(--bg-input)] px-2 text-sm"
                                    value={p.method}
                                    onChange={(e) => updatePayment(i, 'method', e.target.value)}
                                >
                                    {PAYMENT_METHODS.filter(m => m.value !== 'mixed').map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={p.amount}
                                    onChange={(e) => updatePayment(i, 'amount', e.target.value)}
                                />
                                <button
                                    className="h-10 px-2 rounded-lg border border-[hsl(var(--border))] text-sm hover:bg-[var(--bg-muted)]"
                                    onClick={() => removePayment(i)}
                                    type="button"
                                >
                                    Quitar
                                </button>
                            </div>
                        ))}
                        <div className="flex items-center justify-between text-sm">
                            <button
                                className="text-[hsl(var(--primary))] font-medium"
                                onClick={addPayment}
                                type="button"
                            >
                                Agregar método
                            </button>
                            <span className="text-[var(--muted-foreground)]">Total pagos: ${totalMixed.toFixed(2)}</span>
                        </div>
                    </div>
                )}

                {error && <div className="bg-red-50 text-red-600 p-2 mb-4 rounded text-sm border border-red-100">{error}</div>}

                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                    <Button onClick={handleConfirm} isLoading={isLoading}>Confirmar pago</Button>
                </div>
            </div>
        </div>
    );
}
