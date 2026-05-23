import React, { useMemo, useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { X, Check, Delete, ArrowRight, AlertTriangle, ShoppingBag } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatMoney } from '../../utils/format';

const QUICK_AMOUNTS = (total) => {
    const exact = total;
    const next5 = Math.ceil(total / 5) * 5;
    const next10 = Math.ceil(total / 10) * 10;
    const next50 = Math.ceil(total / 50) * 50;
    const next100 = Math.ceil(total / 100) * 100;
    const next200 = Math.ceil(total / 200) * 200;
    const next500 = Math.ceil(total / 500) * 500;

    return [...new Set([exact, next5, next10, next50, next100, next200, next500])]
        .filter(a => a >= total)
        .sort((a, b) => a - b)
        .slice(0, 4);
};

export function PaymentModal({ total, items, onClose, onConfirm, isLoading }) {
    const [step, setStep] = useState('payment'); // payment | confirm | result
    const [received, setReceived] = useState(total.toString());
    const [method, setMethod] = useState('cash');
    const [confirmError, setConfirmError] = useState('');

    const receivedNum = parseFloat(received) || 0;
    const change = Math.max(0, receivedNum - total);
    const isReady = receivedNum >= total || method !== 'cash';

    const quickAmounts = useMemo(() => QUICK_AMOUNTS(total), [total]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (step !== 'payment') return;
            if (e.key === 'Enter' && isReady) handleProceed();
            if (e.key === 'Escape') onClose();
            if (/[0-9]/.test(e.key)) handleKeypress(e.key);
            if (e.key === '.') handleKeypress('.');
            if (e.key === 'Backspace') handleKeypress('DEL');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [received, isReady, step]);

    const handleKeypress = (val) => {
        if (val === 'DEL') {
            setReceived(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
        } else if (val === '.') {
            if (!received.includes('.')) setReceived(prev => prev + '.');
        } else {
            setReceived(prev => (prev === '0' || prev === total.toString()) ? val : prev + val);
        }
    };

    const handleProceed = () => {
        if (!isReady) return;
        setStep('confirm');
        setConfirmError('');
    };

    const handleConfirm = async () => {
        setConfirmError('');
        try {
            await onConfirm({
                method,
                amount: receivedNum,
                change: method === 'cash' ? change : 0,
                payments: [{ method, amount: total }]
            });
            setStep('result');
        } catch (e) {
            setConfirmError(e.message || 'Error al procesar el pago');
            setStep('payment');
        }
    };

    if (step === 'confirm') {
        return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-md">
                <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border-4 border-gray-100 animate-in zoom-in duration-200">
                    <div className="text-center mb-8">
                        <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShoppingBag className="h-8 w-8 text-blue-600" />
                        </div>
                        <h2 className="text-3xl font-black">Confirmar Cobro</h2>
                        <p className="text-gray-500 mt-2">Revisa los datos antes de continuar</p>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>Método de pago</span>
                                <span className="font-black uppercase">{method === 'cash' ? 'EFECTIVO' : method === 'card' ? 'TARJETA' : method === 'transfer' ? 'TRANSFERENCIA' : 'MIXTO'}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>Total a cobrar</span>
                                <span className="font-black text-xl text-gray-900">${total.toFixed(2)}</span>
                            </div>
                            {method === 'cash' && (
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>Recibido</span>
                                    <span className="font-black">${receivedNum.toFixed(2)}</span>
                                </div>
                            )}
                            {method === 'cash' && change > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-green-600 font-bold">Cambio</span>
                                    <span className="font-black text-green-600">${change.toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        {items && items.length > 0 && (
                            <div className="bg-gray-50 rounded-2xl p-4 max-h-40 overflow-y-auto">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Productos ({items.length})</p>
                                {items.map(item => (
                                    <div key={item.id} className="flex justify-between text-sm py-1">
                                        <span className="truncate mr-2">{item.name} x{item.quantity}</span>
                                        <span className="font-bold">${(Number(item.price) * Number(item.quantity)).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {confirmError && (
                        <div className="p-3 mb-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm font-bold text-center">
                            {confirmError}
                        </div>
                    )}

                    <div className="flex gap-4">
                        <Button
                            variant="secondary"
                            className="flex-1 h-16 text-lg font-bold rounded-2xl"
                            onClick={() => { setStep('payment'); setConfirmError(''); }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 h-16 text-lg font-bold rounded-2xl bg-green-500 hover:bg-green-600"
                            onClick={handleConfirm}
                            isLoading={isLoading}
                        >
                            {isLoading ? 'Procesando...' : 'Confirmar Pago'}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-0 sm:p-4 z-50 backdrop-blur-md">
            <div className="bg-[var(--card)] text-[var(--foreground)] rounded-none sm:rounded-[2.5rem] w-full max-w-5xl h-full sm:h-auto overflow-hidden border-4 border-[var(--border)] shadow-[0_0_50px_rgba(0,0,0,0.3)] flex flex-col md:flex-row">

                {/* Left Side: Summary & Method Selection */}
                <div className="flex-1 p-10 bg-[var(--bg-muted)] border-r-4 border-[var(--border)] flex flex-col justify-between">
                    <div className="space-y-8">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-black tracking-tighter">FINALIZAR COBRO</h2>
                            <button onClick={onClose} className="p-3 hover:bg-red-100 text-red-500 rounded-2xl transition-all active:scale-90">
                                <X className="h-8 w-8" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="p-8 bg-white rounded-[2rem] border-2 border-[var(--border)] shadow-xl">
                                <p className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Total de la nota</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-bold text-gray-400">$</span>
                                    <span className="text-7xl font-black text-black tracking-tighter leading-none">
                                        {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: 'cash', label: 'EFECTIVO', icon: '💵' },
                                    { id: 'card', label: 'TARJETA', icon: '💳' },
                                    { id: 'transfer', label: 'TRANSF.', icon: '🏦' },
                                    { id: 'mixed', label: 'MIXTO', icon: '🧩' }
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setMethod(m.id)}
                                        className={cn(
                                            "h-24 rounded-[1.5rem] border-4 font-black text-xl transition-all flex flex-col items-center justify-center gap-1",
                                            method === m.id
                                                ? "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))] shadow-[0_10px_20px_rgba(0,0,0,0.2)] -translate-y-1"
                                                : "bg-white border-[var(--border)] text-gray-400 hover:border-gray-300"
                                        )}
                                    >
                                        <span className="text-3xl">{m.icon}</span>
                                        <span className="text-xs tracking-widest">{m.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className={cn(
                        "mt-10 p-8 rounded-[2rem] border-4 transition-all shadow-2xl",
                        change >= 0 ? "bg-blue-600 border-blue-400 text-white" : "bg-red-500 border-red-300 text-white"
                    )}>
                        <p className="text-xs font-black uppercase tracking-[0.2em] opacity-80 mb-2">
                            {change >= 0 ? 'Dar de cambio al cliente' : 'Falta dinero'}
                        </p>
                        <p className="text-6xl font-black tracking-tighter">
                            ${Math.abs(change).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                {/* Right Side: Keypad */}
                <div className="flex-1 p-10 bg-white flex flex-col gap-8">
                    {method === 'cash' ? (
                        <>
                            <div className="space-y-3">
                                <p className="text-sm font-black text-gray-400 uppercase tracking-widest text-right">¿Cuánto recibiste?</p>
                                <div className="text-7xl font-black text-right p-6 bg-gray-50 rounded-[2rem] border-4 border-gray-200 font-mono shadow-inner text-black">
                                    <span className="text-3xl text-gray-300 mr-2">$</span>{received}
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-3">
                                {quickAmounts.map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => setReceived(amt.toString())}
                                        className="h-16 bg-green-100 text-green-800 border-2 border-green-200 rounded-2xl font-black text-lg hover:bg-green-200 active:scale-95 transition-all shadow-sm"
                                    >
                                        ${amt.toFixed(2)}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-3 gap-4 flex-1">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'BORRAR'].map(k => (
                                    <button
                                        key={k}
                                        onClick={() => handleKeypress(k === 'BORRAR' ? 'DEL' : k.toString())}
                                        className={cn(
                                            "rounded-[1.5rem] border-2 border-gray-100 text-3xl font-black transition-all active:scale-90 flex items-center justify-center shadow-sm",
                                            k === 'BORRAR' ? "bg-red-50 text-red-500 text-sm" : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                                        )}
                                    >
                                        {k}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-blue-50/50 rounded-[3rem] border-4 border-dashed border-blue-100">
                            <div className="h-32 w-32 bg-white text-blue-500 rounded-full flex items-center justify-center mb-6 shadow-xl">
                                <ArrowRight className="h-16 w-16" />
                            </div>
                            <h3 className="text-3xl font-black mb-4">PAGO CON {method.toUpperCase()}</h3>
                            <p className="text-xl text-blue-800 font-medium">
                                Cobra primero en la terminal bancaria.<br />
                                <span className="font-black text-4xl mt-4 block">TOTAL: ${total.toFixed(2)}</span>
                            </p>
                        </div>
                    )}

                    <button
                        className={cn(
                            "w-full h-20 text-2xl font-black rounded-[2rem] shadow-[0_10px_20px_rgba(0,0,0,0.15)] transition-all flex items-center justify-center gap-4 active:scale-95",
                            isReady ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        )}
                        onClick={handleProceed}
                        disabled={!isReady}
                    >
                        <span>REVISAR Y COBRAR</span>
                        <ArrowRight className="h-8 w-8" />
                    </button>
                </div>
            </div>
        </div>
    );
}
