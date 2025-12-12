import React from 'react';
import { Trash2, Plus, Minus } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { Button } from '../common/Button';
import { formatMoney } from '../../utils/format';
import { cn } from '../../utils/cn';

export const Cart = () => {
    const { items, removeItem, updateQuantity, getTotals } = useCartStore();
    const { total, tax, subtotal } = getTotals();

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
                {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm">
                        <div className="h-12 w-12 bg-gray-100 rounded-md flex items-center justify-center text-xs font-bold text-gray-500">
                            {String(item.name).slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{item.name}</h4>
                            <p className="text-xs text-[var(--muted-foreground)]">{formatMoney(item.price)}</p>
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
                ))}
            </div>

            <div className="mt-4 border-t border-[var(--border)] pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">Subtotal</span>
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
