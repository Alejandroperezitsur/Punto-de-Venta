import React, { useRef, useCallback, memo, useEffect, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { formatMoney } from '../../utils/format';
import { cn } from '../../utils/cn';

const LOW_STOCK_THRESHOLD = 5;
const VIRTUALIZE_THRESHOLD = 50;
const ROW_HEIGHT = 44;

interface CartItemRowProps {
  item: any;
  isRecent: boolean;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  index: number;
}

const CartItemRow = memo(function CartItemRow({ item, isRecent, onUpdateQuantity, onRemove, index }: CartItemRowProps) {
  const isLowStock = item.stock !== undefined && item.stock <= LOW_STOCK_THRESHOLD;
  const isOutOfStock = item.stock !== undefined && item.stock <= 0;
  const lineTotal = useMemo(() => item.price * item.quantity, [item.price, item.quantity]);
  const rowRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case '+':
        e.preventDefault();
        onUpdateQuantity(item.id, item.quantity + 1);
        break;
      case '-':
        e.preventDefault();
        if (item.quantity <= 1) onRemove(item.id);
        else onUpdateQuantity(item.id, item.quantity - 1);
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        onRemove(item.id);
        break;
    }
  }, [item.id, item.quantity, onUpdateQuantity, onRemove]);

  useEffect(() => {
    if (isRecent && rowRef.current) {
      rowRef.current.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }, [isRecent]);

  return (
    <div
      ref={rowRef}
      className={cn(
        'flex items-center gap-2 py-1.5 border-b border-border/10 last:border-0 min-h-[var(--touch-target-min)] cart-item-enter',
        isRecent && 'bg-success/[0.04]',
        isOutOfStock && 'opacity-50',
      )}
      role="listitem"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`${item.name}, ${item.quantity} unidades, ${formatMoney(lineTotal)}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-semibold truncate" title={item.name}>{item.name}</span>
          <span className="text-[10px] text-muted-foreground/40 shrink-0 tabular-nums">@ {formatMoney(item.price)}</span>
        </div>
        {isLowStock && (
          <span className="text-[9px] font-semibold text-warning leading-none">stock bajo</span>
        )}
      </div>
      <div className="flex items-center gap-px bg-muted/20 rounded-md border border-border/20">
        <button
          className={cn(
            'min-w-[var(--touch-target-min)] min-h-[var(--touch-target-min)] flex items-center justify-center rounded-l-md',
            'text-muted-foreground hover:bg-muted/50 active:bg-muted/70 transition-colors',
          )}
          onClick={() => item.quantity <= 1 ? onRemove(item.id) : onUpdateQuantity(item.id, item.quantity - 1)}
          aria-label={item.quantity <= 1 ? `Eliminar ${item.name}` : `Reducir cantidad de ${item.name}`}
        >
          {item.quantity <= 1 ? <Trash2 className="size-3.5 text-danger" /> : <Minus className="size-3.5" />}
        </button>
        <span className="w-8 text-center text-xs font-bold tabular-nums select-none text-foreground">{item.quantity}</span>
        <button
          className={cn(
            'min-w-[var(--touch-target-min)] min-h-[var(--touch-target-min)] flex items-center justify-center rounded-r-md',
            'text-muted-foreground hover:bg-muted/50 active:bg-muted/70 transition-colors',
          )}
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          aria-label={`Aumentar cantidad de ${item.name}`}
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      <div className="text-right w-[72px]">
        <span className="text-xs font-bold tabular-nums">{formatMoney(lineTotal)}</span>
      </div>
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
      recentTimer.current = setTimeout(() => setRecentId(null), 800);
    }
    prevItemsLen.current = items.length;
    return () => { if (recentTimer.current) clearTimeout(recentTimer.current); };
  }, [items]);

  const handleUpdateQuantity = useCallback((id: string, qty: number) => updateQuantity(id, qty), [updateQuantity]);
  const handleRemove = useCallback((id: string) => removeItem(id), [removeItem]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8" role="status">
        <div className="size-10 rounded-lg bg-muted/50 flex items-center justify-center mb-2">
          <ShoppingBag className="size-5 opacity-40" />
        </div>
        <p className="text-sm font-semibold">Carrito vacio</p>
        <p className="text-xs font-medium text-muted-foreground/60">Escanee o busque productos</p>
      </div>
    );
  }

  if (shouldVirtualize) {
    return (
      <div
        ref={scrollContainerRef}
        className="h-full overflow-y-auto"
        role="list"
        aria-label="Productos en el carrito"
      >
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
          {virtualizer.getVirtualItems().map(virtualRow => {
            const item = items[virtualRow.index];
            return (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <CartItemRow
                  item={item}
                  index={virtualRow.index}
                  isRecent={recentId === item.id}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemove}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-px" role="list" aria-label="Productos en el carrito">
      {items.map((item, i) => (
        <div
          key={item.id}
          className="cart-item-enter"
        >
          <CartItemRow
            item={item}
            index={i}
            isRecent={recentId === item.id}
            onUpdateQuantity={handleUpdateQuantity}
            onRemove={handleRemove}
          />
        </div>
      ))}
    </div>
  );
});
