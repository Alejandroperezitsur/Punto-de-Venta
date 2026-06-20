import React, { useRef, useCallback, memo, useEffect, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Trash2, Plus, Minus, ShoppingBag, Package } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { formatMoney } from '../../utils/format';
import { cn } from '../../utils/cn';

const LOW_STOCK_THRESHOLD = 5;
const VIRTUALIZE_THRESHOLD = 50;
const ROW_HEIGHT = 66;

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
        'flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-150 cart-item-enter relative',
        isRecent && 'bg-success/[0.04]',
        isOutOfStock && 'opacity-35',
        'hover:bg-muted/15',
      )}
      role="listitem"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`${item.name}, ${item.quantity} unidades, ${formatMoney(lineTotal)}`}
    >
      {/* Recent item accent bar */}
      {isRecent && (
        <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-success/50" />
      )}

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold truncate leading-tight text-foreground/90" title={item.name}>{item.name}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-muted-foreground/40 tabular-nums font-medium">@ {formatMoney(item.price)}</span>
          {isLowStock && (
            <span className="flex items-center gap-1 text-[8px] font-bold text-warning bg-warning/8 px-1.5 py-0.5 rounded-md">
              <span className="size-1 rounded-full bg-warning" />
              stock bajo
            </span>
          )}
        </div>
      </div>

      {/* Quantity stepper — refined pill design */}
      <div className="flex items-center gap-0.5 bg-muted/10 rounded-xl border border-border/12 shadow-xs">
        <button
          className={cn(
            'size-9 flex items-center justify-center rounded-l-xl transition-all duration-100',
            'text-muted-foreground hover:bg-muted/40 active:scale-90 active:bg-muted/60',
          )}
          onClick={() => item.quantity <= 1 ? onRemove(item.id) : onUpdateQuantity(item.id, item.quantity - 1)}
          aria-label={item.quantity <= 1 ? `Eliminar ${item.name}` : `Reducir cantidad de ${item.name}`}
        >
          {item.quantity <= 1 ? <Trash2 className="size-3.5 text-danger/50" /> : <Minus className="size-3.5" />}
        </button>
        <span className="w-9 text-center text-sm font-bold tabular-nums select-none text-foreground">{item.quantity}</span>
        <button
          className={cn(
            'size-9 flex items-center justify-center rounded-r-xl transition-all duration-100',
            'text-muted-foreground hover:bg-muted/40 active:scale-90 active:bg-muted/60',
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
      recentTimer.current = setTimeout(() => setRecentId(null), 1000);
    }
    prevItemsLen.current = items.length;
    return () => { if (recentTimer.current) clearTimeout(recentTimer.current); };
  }, [items]);

  const handleUpdateQuantity = useCallback((id: string, qty: number) => updateQuantity(id, qty), [updateQuantity]);
  const handleRemove = useCallback((id: string) => removeItem(id), [removeItem]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16" role="status">
        <div className="relative mb-6">
          <div className="size-24 rounded-3xl bg-muted/10 flex items-center justify-center border border-border/8">
            <ShoppingBag className="size-10 opacity-12" />
          </div>
          <Package className="size-5 text-muted-foreground/10 absolute -bottom-1 -right-1" />
        </div>
        <p className="text-sm font-bold text-foreground/45">Carrito vacío</p>
        <p className="text-xs font-medium text-muted-foreground/30 mt-2 max-w-[180px] text-center leading-relaxed">
          Escanee o busque productos para comenzar una venta
        </p>
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
