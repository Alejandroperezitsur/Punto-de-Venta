import React, { useRef, useCallback, memo, useEffect, useMemo } from 'react';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { formatMoney } from '../../utils/format';
import { cn } from '../../utils/cn';

const LOW_STOCK_THRESHOLD = 5;

interface CartItemRowProps {
  item: any;
  isRecent: boolean;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  index: number;
}

const CartItemRow = memo(function CartItemRow({ item, isRecent, onUpdateQuantity, onRemove, index }: CartItemRowProps) {
  const isLowStock = item.stock !== undefined && item.stock <= LOW_STOCK_THRESHOLD;
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
        'flex items-center gap-1 py-1 border-b border-border/10 last:border-0 min-h-[28px]',
        isRecent && 'bg-success/[0.04]',
      )}
      role="listitem"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`${item.name}, ${item.quantity} unidades, ${formatMoney(lineTotal)}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1">
          <span className="text-[11px] font-semibold truncate" title={item.name}>{item.name}</span>
          <span className="text-[9px] text-muted-foreground/40 shrink-0 tabular-nums">@ {formatMoney(item.price)}</span>
        </div>
        {isLowStock && (
          <span className="text-[8px] font-semibold text-warning leading-none">stock bajo</span>
        )}
      </div>
      <div className="flex items-center gap-0 bg-muted/20 rounded-md border border-border/20">
        <button
          className={cn(
            'size-5 flex items-center justify-center rounded-l-md',
            'text-muted-foreground hover:bg-muted/50 active:bg-muted/70 transition-colors',
          )}
          onClick={() => item.quantity <= 1 ? onRemove(item.id) : onUpdateQuantity(item.id, item.quantity - 1)}
          aria-label={item.quantity <= 1 ? `Eliminar ${item.name}` : `Reducir cantidad de ${item.name}`}
        >
          {item.quantity <= 1 ? <Trash2 className="size-2.5 text-danger" /> : <Minus className="size-2.5" />}
        </button>
        <span className="w-6 text-center text-[11px] font-bold tabular-nums select-none text-foreground">{item.quantity}</span>
        <button
          className={cn(
            'size-5 flex items-center justify-center rounded-r-md',
            'text-muted-foreground hover:bg-muted/50 active:bg-muted/70 transition-colors',
          )}
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          aria-label={`Aumentar cantidad de ${item.name}`}
        >
          <Plus className="size-2.5" />
        </button>
      </div>
      <div className="text-right w-[64px]">
        <span className="text-[11px] font-bold tabular-nums">{formatMoney(lineTotal)}</span>
      </div>
    </div>
  );
});

export const Cart = memo(function Cart() {
  const { items, removeItem, updateQuantity } = useCartStore();
  const [recentId, setRecentId] = React.useState<string | null>(null);
  const recentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (items.length === 0) { setRecentId(null); return; }
    const last = items[items.length - 1];
    setRecentId(last?.id || null);
    if (recentTimer.current) clearTimeout(recentTimer.current);
    recentTimer.current = setTimeout(() => setRecentId(null), 600);
    return () => { if (recentTimer.current) clearTimeout(recentTimer.current); };
  }, [items]);

  const handleUpdateQuantity = useCallback((id: string, qty: number) => updateQuantity(id, qty), [updateQuantity]);
  const handleRemove = useCallback((id: string) => removeItem(id), [removeItem]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8" role="status">
        <div className="size-8 rounded-lg bg-muted/50 flex items-center justify-center mb-2">
          <ShoppingBag className="size-4 opacity-40" />
        </div>
        <p className="text-xs font-semibold">Carrito vacio</p>
        <p className="text-[10px] font-medium text-muted-foreground/60">Escanee o busque productos</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-px" role="list" aria-label="Productos en el carrito">
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
