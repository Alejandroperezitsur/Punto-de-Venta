import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { Button } from '../common/Button';
import { formatMoney } from '../../utils/format';
import { cn } from '../../utils/cn';

const LOW_STOCK_THRESHOLD = 5;

interface SwipeState {
    startX: number;
    currentX: number;
    isSwiping: boolean;
}

export const Cart: React.FC = () => {
    const { items, removeItem, updateQuantity, getTotals } = useCartStore();
    const totals = getTotals();
    const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);
    const [swipeState, setSwipeState] = useState<SwipeState | null>(null);
    const prevItemsRef = useRef(items.length);

    useEffect(() => {
        if (items.length > prevItemsRef.current) {
            const newItem = items[items.length - 1];
            setRecentlyAdded(newItem?.id || null);
            const timer = setTimeout(() => setRecentlyAdded(null), 1500);
            return () => clearTimeout(timer);
        }
        prevItemsRef.current = items.length;
    }, [items]);

    const handleTouchStart = useCallback((e: React.TouchEvent, itemId: string) => {
        setSwipeState({
            startX: e.touches[0].clientX,
            currentX: e.touches[0].clientX,
            isSwiping: true,
        });
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!swipeState?.isSwiping) return;
        setSwipeState(prev => prev ? { ...prev, currentX: e.touches[0].clientX } : prev);
    }, [swipeState]);

    const handleTouchEnd = useCallback((itemId: string) => {
        if (!swipeState) return;
        const diff = swipeState.currentX - swipeState.startX;
        if (diff < -80) {
            removeItem(itemId);
        }
        setSwipeState(null);
    }, [swipeState, removeItem]);

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-[var(--muted-foreground)] p-8" role="status">
                <div className="w-16 h-16 bg-[var(--bg-muted)] rounded-full flex items-center justify-center mb-4">
                    <ShoppingBag className="h-8 w-8 opacity-50" />
                </div>
                <p className="font-bold">El carrito esta vacio</p>
                <p className="text-sm">Escanea un producto para comenzar</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto -mx-4 px-4 space-y-3" role="list" aria-label="Productos en el carrito">
                {items.map((item) => {
                    const isLowStock = item.stock !== undefined && item.stock <= LOW_STOCK_THRESHOLD;
                    const isRecent = recentlyAdded === item.id;
                    const swipeOffset = swipeState?.isSwiping ? Math.max(0, swipeState.currentX - swipeState.startX) : 0;

                    return (
                        <div
                            key={item.id}
                            role="listitem"
                            className={cn(
                                "flex items-center gap-4 p-4 bg-white border-2 rounded-2xl shadow-sm transition-all duration-300",
                                isRecent
                                    ? "border-green-500 bg-green-50 scale-[1.02] ring-4 ring-green-100"
                                    : "border-gray-100",
                                isLowStock && !isRecent && "border-l-8 border-l-amber-500"
                            )}
                            style={swipeState?.isSwiping ? { transform: `translateX(${swipeOffset}px)` } : undefined}
                            onTouchStart={(e) => handleTouchStart(e, item.id)}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={() => handleTouchEnd(item.id)}
                            aria-label={`${item.name}, ${item.quantity} unidades, ${formatMoney(item.price * item.quantity)}`}
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
                                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-1 rounded-full uppercase" aria-label="Stock bajo">
                                            Poco Stock!
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-gray-50 p-1 rounded-2xl border-2 border-gray-100">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-12 w-12 bg-white shadow-sm border border-gray-100 rounded-xl min-h-[48px] min-w-[48px]"
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    aria-label={item.quantity === 1 ? `Eliminar ${item.name}` : `Reducir cantidad de ${item.name}`}
                                >
                                    {item.quantity === 1 ? <Trash2 className="h-5 w-5 text-red-500" /> : <Minus className="h-5 w-5" />}
                                </Button>
                                <span className="w-10 text-center text-2xl font-black text-gray-800" aria-live="polite">{item.quantity}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-12 w-12 bg-white shadow-sm border border-gray-100 rounded-xl min-h-[48px] min-w-[48px]"
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    aria-label={`Aumentar cantidad de ${item.name}`}
                                >
                                    <Plus className="h-5 w-5" />
                                </Button>
                            </div>
                            <div className="text-right w-24">
                                <p className="font-black text-xl text-gray-900">{formatMoney(item.price * item.quantity)}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 border-t border-[var(--border)] pt-4 space-y-2 px-1">
                <div className="flex justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">Subtotal ({items.length} articulos)</span>
                    <span>{formatMoney(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">IVA (16%)</span>
                    <span>{formatMoney(totals.tax)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold mt-4">
                    <span>Total</span>
                    <span className="text-[var(--primary)]">{formatMoney(totals.total)}</span>
                </div>
            </div>
        </div>
    );
};
