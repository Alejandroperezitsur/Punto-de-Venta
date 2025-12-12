import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { formatMoney } from '../../utils/format';
import { X, CreditCard, Banknote, User } from 'lucide-react';

export const PaymentModal = ({ total, onClose, onConfirm, isLoading }) => {
    const [method, setMethod] = useState('cash');
    const [amount, setAmount] = useState('');
    const [change, setChange] = useState(0);

    const handleAmountChange = (e) => {
        const val = parseFloat(e.target.value) || 0;
        setAmount(e.target.value);
        setChange(Math.max(0, val - total));
    };

    const methods = [
        { id: 'cash', label: 'Efectivo', icon: Banknote },
        { id: 'card', label: 'Tarjeta', icon: CreditCard },
        { id: 'credit', label: 'Crédito', icon: User },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-[var(--card)] rounded-xl shadow-lg w-full max-w-md overflow-hidden border border-[var(--border)]">
                <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-muted)]">
                    <h3 className="font-bold text-lg">Cobrar / Cerrar Venta</h3>
                    <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <p className="text-[var(--muted-foreground)]">Total a Pagar</p>
                        <p className="text-4xl font-bold text-[var(--primary)]">{formatMoney(total)}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {methods.map((m) => {
                            const Icon = m.icon;
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => setMethod(m.id)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${method === m.id
                                            ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                                            : 'border-[var(--border)] hover:bg-[var(--bg-muted)]'
                                        }`}
                                >
                                    <Icon className="h-6 w-6 mb-1" />
                                    <span className="text-sm font-medium">{m.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {method === 'cash' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Recibido</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        className="flex h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] pl-8 pr-4 text-lg font-bold focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
                                        value={amount}
                                        onChange={handleAmountChange}
                                        autoFocus
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-[var(--bg-muted)] rounded-lg">
                                <span className="font-medium">Cambio</span>
                                <span className="text-xl font-bold text-green-600">{formatMoney(change)}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-[var(--border)] flex gap-3">
                    <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
                    <Button
                        className="flex-1 h-12 text-lg"
                        onClick={() => onConfirm({ method, amount: parseFloat(amount) || total })}
                        disabled={isLoading || (method === 'cash' && (parseFloat(amount) || 0) < total)}
                        isLoading={isLoading}
                    >
                        Confirmar Cobro
                    </Button>
                </div>
            </div>
        </div>
    );
};
