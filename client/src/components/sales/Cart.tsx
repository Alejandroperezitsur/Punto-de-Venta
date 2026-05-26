import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { Button } from '../ui/Button';
import { formatMoney } from '../../utils/format';
import { cn } from '../../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

const LOW_STOCK_THRESHOLD = 5;

const CartItemRow = memo(function CartItemRow({ item, isRecent, onUpdateQuantity, onRemove }) {
  const isLowStock = item.stock !== undefined && item.stock <= LOW_STOCK_THRESHOLD;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 bg-card',
        isRecent
          ? 'border-success/40 bg-success/[0.04] shadow-md shadow-success/10'
          : 'border-border hover:border-foreground/20',
      )}
      role="listitem"
      aria-label={`${item.name}, ${item.quantity} unidades, ${formatMoney(item.price * item.quantity)}`}
    >
      <div className={cn(
        'size-14 rounded-2xl flex items-center justify-center text-lg font-black shrink-0',
        isRecent ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground',
      )}>
        {String(item.name).slice(0, 2).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm truncate">{item.name}</h4>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs font-semibold text-muted-foreground">{formatMoney(item.price)} c/u</p>
          {isLowStock && (
            <span className="text-[10px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded-full uppercase">
              Stock bajo
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-2xl border border-border">
        <button
          className="size-10 flex items-center justify-center rounded-xl bg-card shadow-sm border border-border hover:bg-surface-hover active:scale-90 transition-all min-h-[40px] min-w-[40px]"
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          aria-label={item.quantity === 1 ? `Eliminar ${item.name}` : `Reducir cantidad de ${item.name}`}
        >
          {item.quantity === 1 ? <Trash2 className="size-4 text-danger" /> : <Minus className="size-4" />}
        </button>
        <span className="w-8 text-center text-lg font-bold" aria-live="polite">{item.quantity}</span>
        <button
          className="size-10 flex items-center justify-center rounded-xl bg-card shadow-sm border border-border hover:bg-surface-hover active:scale-90 transition-all min-h-[40px] min-w-[40px]"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          aria-label={`Aumentar cantidad de ${item.name}`}
        >
          <Plus className="size-4" />
        </button>
      </div>

      <div className="text-right min-w-[80px]">
        <p className="font-black text-base">{formatMoney(item.price * item.quantity)}</p>
      </div>
    </motion.div>
  );
});

export const Cart = () => {
  const { items, removeItem, updateQuantity, getTotals } = useCartStore();
  const totals = getTotals();
  const [recentlyAdded, setRecentlyAdded] = useState(null);
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

  const handleUpdateQuantity = useCallback((id, qty) => updateQuantity(id, qty), [updateQuantity]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8" role="status">
        <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <ShoppingBag className="size-8 opacity-40" />
        </div>
        <p className="font-bold">Carrito vacío</p>
        <p className="text-sm font-medium">Escanea un producto para comenzar</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
        <div className="flex-1 space-y-1.5 pr-1" role="list" aria-label="Productos en el carrito">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              isRecent={recentlyAdded === item.id}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={removeItem}
            />
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-4 pt-4 border-t border-border space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground font-medium">Subtotal ({items.length} artículo{items.length !== 1 ? 's' : ''})</span>
          <span className="font-semibold">{formatMoney(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground font-medium">IVA (16%)</span>
          <span className="font-semibold">{formatMoney(totals.tax)}</span>
        </div>
        <div className="flex justify-between text-xl font-bold pt-2 border-t border-border/50">
          <span>Total</span>
          <span className="text-primary">{formatMoney(totals.total)}</span>
        </div>
      </div>
    </div>
  );
};
