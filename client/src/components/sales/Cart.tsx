import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { Button } from '../ui/Button';
import { formatMoney } from '../../utils/format';
import { cn } from '../../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

const LOW_STOCK_THRESHOLD = 5;

const fadeItem = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.08 } },
  exit: { opacity: 0, transition: { duration: 0.06 } },
};

const CartItemRow = memo(function CartItemRow({ item, isRecent, onUpdateQuantity, onRemove }) {
  const isLowStock = item.stock !== undefined && item.stock <= LOW_STOCK_THRESHOLD;

  return (
    <motion.div
      variants={fadeItem}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg border transition-colors bg-card',
        isRecent
          ? 'border-success/40 bg-success/[0.04]'
          : 'border-border',
      )}
      role="listitem"
      aria-label={`${item.name}, ${item.quantity} unidades, ${formatMoney(item.price * item.quantity)}`}
    >
      <div className={cn(
        'size-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
        isRecent ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground',
      )}>
        {String(item.name).slice(0, 2).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm truncate">{item.name}</h4>
        <div className="flex items-center gap-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">{formatMoney(item.price)} c/u</p>
          {isLowStock && (
            <span className="text-[9px] font-bold text-warning bg-warning/10 px-1 py-0.5 rounded uppercase">Stock bajo</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-lg border border-border">
        <button
          className="size-9 flex items-center justify-center rounded-md bg-card border border-border hover:bg-surface-hover active:scale-95 transition-all min-h-[36px] min-w-[36px]"
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          aria-label={item.quantity === 1 ? `Eliminar ${item.name}` : `Reducir cantidad de ${item.name}`}
        >
          {item.quantity === 1 ? <Trash2 className="size-3.5 text-danger" /> : <Minus className="size-3.5" />}
        </button>
        <span className="w-6 text-center text-sm font-bold" aria-live="polite">{item.quantity}</span>
        <button
          className="size-9 flex items-center justify-center rounded-md bg-card border border-border hover:bg-surface-hover active:scale-95 transition-all min-h-[36px] min-w-[36px]"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          aria-label={`Aumentar cantidad de ${item.name}`}
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      <div className="text-right min-w-[65px]">
        <p className="font-bold text-sm">{formatMoney(item.price * item.quantity)}</p>
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
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4" role="status">
        <div className="size-10 rounded-lg bg-muted flex items-center justify-center mb-2">
          <ShoppingBag className="size-5 opacity-40" />
        </div>
        <p className="text-sm font-semibold">Carrito vacío</p>
        <p className="text-xs font-medium">Escanea un producto</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-1 pr-1" role="list" aria-label="Productos en el carrito">
        <AnimatePresence mode="sync">
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

      <div className="mt-3 pt-3 border-t border-border space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground font-medium">Subtotal ({items.length} artículo{items.length !== 1 ? 's' : ''})</span>
          <span className="font-semibold">{formatMoney(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground font-medium">IVA (16%)</span>
          <span className="font-semibold">{formatMoney(totals.tax)}</span>
        </div>
        <div className="flex justify-between text-base font-bold pt-2 border-t border-border/50">
          <span>Total</span>
          <span className="text-primary">{formatMoney(totals.total)}</span>
        </div>
      </div>
    </div>
  );
};
