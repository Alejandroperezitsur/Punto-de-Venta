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
                                "flex items-center gap-3 p-3 bg-[var(--card)] border rounded-lg shadow-sm transition-all duration-300",
                                isRecent
                                    ? "border-green-500 bg-green-50 dark:bg-green-900/20 scale-[1.02] animate-pulse"
                                    : "border-[var(--border)]",
                                isLowStock && !isRecent && "border-l-4 border-l-amber-500"
                            )}
                        >
                            <div className={cn(
                                "h-12 w-12 rounded-md flex items-center justify-center text-xs font-bold",
                                isRecent ? "bg-green-200 text-green-700" : "bg-gray-100 text-gray-500"
                            )}>
                                {String(item.name).slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">{item.name}</h4>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs text-[var(--muted-foreground)]">{formatMoney(item.price)}</p>
                                    {isLowStock && (
                                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
                                            <AlertTriangle className="h-2.5 w-2.5" />
                                            Stock: {item.stock}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                    {item.quantity === 1 ? <Trash2 className="h-4 w-4 text-red-500" /> : <Minus className="h-4 w-4" />}
                                </Button>
                                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="text-right w-20">
                                <p className="font-bold text-sm">{formatMoney(item.price * item.quantity)}</p>
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
