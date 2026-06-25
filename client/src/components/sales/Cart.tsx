import React, { useRef, useCallback, memo, useEffect, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Trash2, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { formatMoney } from '../../utils/format';
import { cn } from '../../utils/cn';

const LOW_STOCK_THRESHOLD = 5;
const VIRTUALIZE_THRESHOLD = 50;
const ROW_HEIGHT = 60;

interface CartItemRowProps {
  item: any;
  isRecent: boolean;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}

const CartItemRow = memo(function CartItemRow({ item, isRecent, onUpdateQuantity, onRemove }: CartItemRowProps) {
  const isLowStock = item.stock !== undefined && item.stock <= LOW_STOCK_THRESHOLD;
  const isOutOfStock = item.stock !== undefined && item.stock <= 0;
  const lineTotal = useMemo(() => item.price * item.quantity, [item.price, item.quantity]);

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
        isRecent && 'bg-success-bg/50',
        isOutOfStock && 'opacity-40',
        'hover:bg-bg-surface-hover',
        'group',
      )}
      role="listitem"
      tabIndex={0}
      aria-label={`${item.name}, ${item.quantity} unidades, ${formatMoney(lineTotal)}`}
    >
      {/* Product image placeholder */}
      <div className="size-10 rounded-md bg-bg-inset flex items-center justify-center shrink-0 overflow-hidden">
        {item.image ? (
          <img src={item.image} alt={item.name} className="size-full object-cover" />
        ) : (
          <ShoppingBag className="size-4 text-text-disabled" />
        )}
      </div>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate text-text-primary">{item.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text-tertiary tabular-nums">{formatMoney(item.price)} c/u</span>
          {isLowStock && (
            <span className="text-[10px] font-semibold text-warning-text bg-warning-bg px-1.5 py-0.5 rounded">
              {item.stock} uds
            </span>
          )}
        </div>
      </div>

      {/* Quantity control */}
      <div className="flex items-center gap-0.5 bg-bg-inset rounded-md border border-border-subtle">
        <button
          onClick={() => item.quantity <= 1 ? onRemove(item.id) : onUpdateQuantity(item.id, item.quantity - 1)}
          className="size-8 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-surface-active transition-colors rounded-l-md"
          aria-label={item.quantity <= 1 ? 'Eliminar' : 'Reducir'}
        >
          {item.quantity <= 1 ? <Trash2 className="size-3.5 text-danger/60" /> : <Minus className="size-3.5" />}
        </button>
        <span className="w-8 text-center text-sm font-bold tabular-nums select-none text-text-primary">{item.quantity}</span>
        <button
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          className="size-8 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-surface-active transition-colors rounded-r-md"
          aria-label="Aumentar"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {/* Line total */}
      <span className={cn(
        'w-[80px] text-right shrink-0 text-sm font-bold tabular-nums',
        isRecent ? 'text-success-text' : 'text-text-primary',
      )}>
        {formatMoney(lineTotal)}
      </span>
    </div>
  );
});

export const Cart = memo(function Cart() {
  const items = useCartStore(s => s.items);
  const removeItem = useCartStore(s => s.removeItem);
  const updateQuantity = useCartStore(s => s.updateQuantity);
  const [recentId, setRecentId] = useState<string | null>(null);
  const recentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevItemsLen = useRef(items.length);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const shouldVirtualize = items.length > VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
    enabled: shouldVirtualize,
  });

  useEffect(() => {
    if (items.length === 0) { setRecentId(null); prevItemsLen.current = 0; return; }
    if (items.length > prevItemsLen.current) {
      const last = items[items.length - 1];
      setRecentId(last?.id || null);
      if (recentTimer.current) clearTimeout(recentTimer.current);
      recentTimer.current = setTimeout(() => setRecentId(null), 1200);
    }
    prevItemsLen.current = items.length;
    return () => { if (recentTimer.current) clearTimeout(recentTimer.current); };
  }, [items]);

  const handleUpdateQuantity = useCallback((id: string, qty: number) => updateQuantity(id, qty), [updateQuantity]);
  const handleRemove = useCallback((id: string) => removeItem(id), [removeItem]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-10 px-4" role="status">
        <div className="size-20 rounded-xl bg-bg-inset border border-dashed border-border-default flex items-center justify-center mb-4">
          <ShoppingBag className="size-10 text-text-disabled" />
        </div>
        <p className="text-base font-semibold text-text-primary mb-1">Carrito vacio</p>
        <p className="text-sm text-text-tertiary max-w-[240px] text-center">
          Escanee un producto o busque en el catalogo para comenzar
        </p>
      </div>
    );
  }

  if (shouldVirtualize) {
    return (
      <div ref={scrollContainerRef} className="h-full overflow-y-auto" role="list" aria-label="Productos en el carrito">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
          {virtualizer.getVirtualItems().map(virtualRow => (
            <div
              key={items[virtualRow.index].id}
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%',
                height: virtualRow.size, transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <CartItemRow
                item={items[virtualRow.index]}
                isRecent={recentId === items[virtualRow.index].id}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemove}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1" role="list" aria-label="Productos en el carrito">
      {items.map(item => (
        <CartItemRow
          key={item.id}
          item={item}
          isRecent={recentId === item.id}
          onUpdateQuantity={handleUpdateQuantity}
          onRemove={handleRemove}
        />
      ))}
    </div>
  );
});
