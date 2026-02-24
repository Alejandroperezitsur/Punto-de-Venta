import React, { useMemo, useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { X, Check, Delete, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';

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

export function PaymentModal({ total, onClose, onConfirm, isLoading }) {
    const [received, setReceived] = useState(total.toString());
    const [method, setMethod] = useState('cash');
    
    const receivedNum = parseFloat(received) || 0;
    const change = receivedNum - total;
    const isReady = receivedNum >= total || method !== 'cash';

    const quickAmounts = useMemo(() => QUICK_AMOUNTS(total), [total]);

    // Physical Keyboard Support
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && isReady) handleConfirm();
            if (e.key === 'Escape') onClose();
            if (/[0-9]/.test(e.key)) handleKeypress(e.key);
            if (e.key === '.') handleKeypress('.');
            if (e.key === 'Backspace') handleKeypress('DEL');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [received, isReady]);

    const handleKeypress = (val) => {
        if (val === 'DEL') {
            setReceived(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
        } else if (val === '.') {
            if (!received.includes('.')) setReceived(prev => prev + '.');
        } else {
            setReceived(prev => (prev === '0' || prev === total.toString()) ? val : prev + val);
        }
    };

    const handleConfirm = () => {
        if (!isReady) return;
        onConfirm({ 
            method, 
            amount: receivedNum,
            change: method === 'cash' ? Math.max(0, change) : 0,
            payments: [{ method, amount: total }] 
        });
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-0 sm:p-4 z-50 backdrop-blur-md">
            <div className="bg-[var(--card)] text-[var(--foreground)] rounded-none sm:rounded-[2.5rem] w-full max-w-5xl h-full sm:h-auto overflow-hidden border-4 border-[var(--border)] shadow-[0_0_50px_rgba(0,0,0,0.3)] flex flex-col md:flex-row">
                
                {/* Left Side: Summary & Human Labels */}
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

                {/* Right Side: Massive Keypad & Key Labels */}
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
                                        ${amt}
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
                                Cobra primero en la terminal bancaria.<br/>
                                <span className="font-black text-4xl mt-4 block">TOTAL: ${total.toFixed(2)}</span>
                            </p>
                        </div>
                    )}

                    <button
                        className={cn(
                            "w-full h-28 text-3xl font-black rounded-[2rem] shadow-[0_15px_30px_rgba(0,0,0,0.2)] transition-all flex items-center justify-center gap-6 active:scale-95",
                            isReady ? "bg-green-500 hover:bg-green-600 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        )}
                        onClick={handleConfirm}
                        disabled={!isReady || isLoading}
                    >
                        {isLoading ? (
                            <div className="h-10 w-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>LISTO (ENTER)</span>
                                <Check className="h-10 w-10" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
