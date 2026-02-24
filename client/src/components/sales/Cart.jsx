import React, { useEffect, useState, useRef } from 'react';
import { Trash2, Plus, Minus, AlertTriangle } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { Button } from '../common/Button';
import { formatMoney } from '../../utils/format';
import { cn } from '../../utils/cn';

// Low stock threshold (could come from settings)
const LOW_STOCK_THRESHOLD = 5;

export const Cart = () => {
    const { items, removeItem, updateQuantity, getTotals } = useCartStore();
    const { total, tax, subtotal } = getTotals();
    const [recentlyAdded, setRecentlyAdded] = useState(null);
    const prevItemsRef = useRef(items.length);

    // Track recently added items for animation
    useEffect(() => {
        if (items.length > prevItemsRef.current) {
            const newItem = items[items.length - 1];
            setRecentlyAdded(newItem?.id);
            const timer = setTimeout(() => setRecentlyAdded(null), 1500);
            return () => clearTimeout(timer);
        }
        prevItemsRef.current = items.length;
    }, [items]);

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-[var(--muted-foreground)] p-8">
                <div className="w-16 h-16 bg-[var(--bg-muted)] rounded-full flex items-center justify-center mb-4">
                    <Trash2 className="h-8 w-8 opacity-50" />
                </div>
                <p>El carrito está vacío</p>
                <p className="text-sm">Escanea un producto para comenzar</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto -mx-4 px-4 space-y-3">
                {items.map((item) => {
                    const isLowStock = item.stock !== undefined && item.stock <= LOW_STOCK_THRESHOLD;
                    const isRecent = recentlyAdded === item.id;

                    return (
                        <div
                            key={item.id}
                            className={cn(
                                "flex items-center gap-4 p-4 bg-white border-2 rounded-2xl shadow-sm transition-all duration-300",
                                isRecent
                                    ? "border-green-500 bg-green-50 scale-[1.02] ring-4 ring-green-100"
                                    : "border-gray-100",
                                isLowStock && !isRecent && "border-l-8 border-l-amber-500"
                            )}
                        >
                            <div className={cn(
                                "h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-black shrink-0",
                                isRecent ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"
                            )}>
                                {String(item.name).slice(0, 1).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-black text-lg truncate text-gray-800">{item.name}</h4>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-gray-400">{formatMoney(item.price)} c/u</p>
                                    {isLowStock && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-1 rounded-full uppercase">
                                            ¡Poco Stock!
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-gray-50 p-1 rounded-2xl border-2 border-gray-100">
                                <Button variant="ghost" size="icon" className="h-12 w-12 bg-white shadow-sm border border-gray-100 rounded-xl" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                    {item.quantity === 1 ? <Trash2 className="h-6 w-6 text-red-500" /> : <Minus className="h-6 w-6" />}
                                </Button>
                                <span className="w-10 text-center text-2xl font-black text-gray-800">{item.quantity}</span>
                                <Button variant="ghost" size="icon" className="h-12 w-12 bg-white shadow-sm border border-gray-100 rounded-xl" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                                    <Plus className="h-6 w-6" />
                                </Button>
                            </div>
                            <div className="text-right w-24">
                                <p className="font-black text-xl text-gray-900">{formatMoney(item.price * item.quantity)}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 border-t border-[var(--border)] pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">Subtotal ({items.length} artículos)</span>
                    <span>{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">IVA (16%)</span>
                    <span>{formatMoney(tax)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold mt-4">
                    <span>Total</span>
                    <span className="text-[var(--primary)]">{formatMoney(total)}</span>
                </div>
            </div>
        </div>
    );
};
