import React, { useRef, useCallback, memo, useEffect, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { formatMoney } from '../../utils/format';
import { cn } from '../../utils/cn';

const LOW_STOCK_THRESHOLD = 5;
const VIRTUALIZE_THRESHOLD = 50;
const ROW_HEIGHT = 56;

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
        'flex items-center gap-3 py-2.5 px-2 rounded-xl transition-all duration-150 cart-item-enter',
        isRecent && 'bg-success/[0.05] shadow-sm shadow-success/5',
        isOutOfStock && 'opacity-40',
        'hover:bg-muted/25',
      )}
      role="listitem"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`${item.name}, ${item.quantity} unidades, ${formatMoney(lineTotal)}`}
    >
      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate leading-tight" title={item.name}>{item.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-muted-foreground/50 tabular-nums">@ {formatMoney(item.price)}</span>
          {isLowStock && (
            <span className="text-[9px] font-bold text-warning bg-warning/8 px-1.5 py-px rounded-md">stock bajo</span>
          )}
        </div>
      </div>

      {/* Quantity stepper — tactile pill design */}
      <div className="flex items-center gap-0.5 bg-card rounded-xl border border-border/20 shadow-sm">
        <button
          className={cn(
            'size-9 flex items-center justify-center rounded-l-xl transition-all duration-100',
            'text-muted-foreground hover:bg-muted/50 active:scale-90 active:bg-muted/70',
          )}
          onClick={() => item.quantity <= 1 ? onRemove(item.id) : onUpdateQuantity(item.id, item.quantity - 1)}
          aria-label={item.quantity <= 1 ? `Eliminar ${item.name}` : `Reducir cantidad de ${item.name}`}
        >
          {item.quantity <= 1 ? <Trash2 className="size-3.5 text-danger/60" /> : <Minus className="size-3.5" />}
        </button>
        <span className="w-8 text-center text-sm font-bold tabular-nums select-none text-foreground">{item.quantity}</span>
        <button
          className={cn(
            'size-9 flex items-center justify-center rounded-r-xl transition-all duration-100',
            'text-muted-foreground hover:bg-muted/50 active:scale-90 active:bg-muted/70',
          )}
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          aria-label={`Aumentar cantidad de ${item.name}`}
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {/* Line total */}
      <div className="text-right w-[76px] shrink-0">
        <span className="text-sm font-bold tabular-nums text-foreground">{formatMoney(lineTotal)}</span>
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
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10" role="status">
        <div className="size-16 rounded-2xl bg-muted/20 flex items-center justify-center mb-4">
          <ShoppingBag className="size-7 opacity-20" />
        </div>
        <p className="text-sm font-bold text-foreground/60">Carrito vacío</p>
        <p className="text-xs font-medium text-muted-foreground/40 mt-1">Escanee o busque productos</p>
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
    <div className="flex flex-col gap-0.5" role="list" aria-label="Productos en el carrito">
      {items.map((item, i) => (
        <CartItemRow
          key={item.id}
          item={item}
          index={i}
          isRecent={recentId === item.id}
          onUpdateQuantity={handleUpdateQuantity}
          onRemove={handleRemove}
        />
      ))}
    </div>
  );
});
