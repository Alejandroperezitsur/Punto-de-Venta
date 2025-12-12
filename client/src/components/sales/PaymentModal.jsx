import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { formatMoney } from '../../utils/format';
import { X, CreditCard, Banknote, User } from 'lucide-react';

export const PaymentModal = ({ total, onClose, onConfirm, isLoading }) => {
    const [method, setMethod] = useState('cash');
    const [amount, setAmount] = useState(total);
    const [payments, setPayments] = useState([]);

    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    const remaining = Math.max(0, total - totalPaid);
    const change = totalPaid > total ? totalPaid - total : 0;
    const isComplete = totalPaid >= total - 0.01; // tolerance

    const handleAddPayment = () => {
        const val = parseFloat(amount);
        if (!val || val <= 0) return;

        setPayments([...payments, { method, amount: val, id: Date.now() }]);
        const newRemaining = Math.max(0, total - (totalPaid + val));
        setAmount(newRemaining); // Auto-fill next amount
    };

    const removePayment = (id) => {
        setPayments(payments.filter(p => p.id !== id));
        // Reset amount to remaining? maybe logic updates automatically
    };

    const methods = [
        { id: 'cash', label: 'Efectivo', icon: Banknote },
        { id: 'card', label: 'Tarjeta', icon: CreditCard },
        { id: 'transfer', label: 'Transferencia', icon: User }, // changed credit to transfer for clarity or keep credit
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-[hsl(var(--border))]">
                <div className="p-5 border-b border-[hsl(var(--border))] flex justify-between items-center bg-[hsl(var(--muted))/0.5]">
                    <h3 className="font-bold text-xl">Realizar Cobro</h3>
                    <button onClick={onClose} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 grid gap-6">
                    {/* Totals Display */}
                    <div className="flex gap-4 text-center">
                        <div className="flex-1 bg-[hsl(var(--bg-muted))] p-4 rounded-xl border border-[hsl(var(--border))]">
                            <p className="text-sm text-[hsl(var(--muted-foreground))] uppercase font-bold tracking-wider">Total</p>
                            <p className="text-3xl font-bold text-[hsl(var(--primary))]">{formatMoney(total)}</p>
                        </div>
                        <div className="flex-1 bg-[hsl(var(--bg-muted))] p-4 rounded-xl border border-[hsl(var(--border))]">
                            <p className="text-sm text-[hsl(var(--muted-foreground))] uppercase font-bold tracking-wider">Restante</p>
                            <p className={`text-3xl font-bold ${remaining > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {formatMoney(remaining)}
                            </p>
                        </div>
                    </div>

                    {/* Payment Form */}
                    {!isComplete && (
                        <div className="space-y-4 animate-slide-up">
                            <div className="grid grid-cols-3 gap-3">
                                {methods.map((m) => {
                                    const Icon = m.icon;
                                    return (
                                        <button
                                            key={m.id}
                                            onClick={() => setMethod(m.id)}
                                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${method === m.id
                                                ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-md transform scale-[1.02]'
                                                : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
                                                }`}
                                        >
                                            <Icon className="h-6 w-6 mb-1" />
                                            <span className="text-xs font-bold">{m.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[hsl(var(--muted-foreground))]">$</span>
                                    <input
                                        type="number"
                                        className="w-full h-12 pl-8 pr-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-lg font-bold focus:ring-2 focus:ring-[hsl(var(--primary))] focus:outline-none"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddPayment()}
                                        autoFocus
                                        placeholder="0.00"
                                    />
                                </div>
                                <Button onClick={handleAddPayment} className="h-12 px-6 font-bold shadow-sm">
                                    Agregar
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Payments List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {payments.map((p) => (
                            <div key={p.id} className="flex justify-between items-center p-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg shadow-sm animate-fade-in">
                                <span className="flex items-center gap-2 font-medium capitalize">
                                    {methods.find(m => m.id === p.method)?.icon({ className: "w-4 h-4" })}
                                    {methods.find(m => m.id === p.method)?.label}
                                </span>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold">{formatMoney(p.amount)}</span>
                                    <button onClick={() => removePayment(p.id)} className="text-red-500 hover:bg-red-50 p-1 rounded-full transition-colors">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Change Display */}
                    {change > 0 && (
                        <div className="flex justify-between items-center p-4 bg-green-50 border border-green-200 rounded-xl animate-bounce-in">
                            <span className="text-green-800 font-bold uppercase tracking-wider">Cambio a Entregar</span>
                            <span className="text-2xl font-black text-green-700">{formatMoney(change)}</span>
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))/0.3] flex gap-3">
                    <Button variant="ghost" className="flex-1 h-12" onClick={onClose}>Cancelar</Button>
                    <Button
                        className="flex-1 h-12 text-lg font-bold shadow-lg"
                        onClick={() => onConfirm({ method: 'mixed', payments, change })}
                        disabled={isLoading || !isComplete}
                        isLoading={isLoading}
                    >
                        Confirmar Cobro
                    </Button>
                </div>
            </div>
        </div>
    );
};
