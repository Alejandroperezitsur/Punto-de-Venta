import React, { useRef, useCallback, memo, useEffect } from 'react';
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
}

const CartItemRow = memo(function CartItemRow({ item, isRecent, onUpdateQuantity, onRemove }: CartItemRowProps) {
  const isLowStock = item.stock !== undefined && item.stock <= LOW_STOCK_THRESHOLD;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 py-1.5 border-b border-border/10 last:border-0 min-h-[32px]',
        isRecent && 'bg-success/[0.03]',
      )}
      role="listitem"
      aria-label={`${item.name}, ${item.quantity} unidades, ${formatMoney(item.price * item.quantity)}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-semibold truncate">{item.name}</span>
          <span className="text-[10px] text-muted-foreground/50 shrink-0">@ {formatMoney(item.price)}</span>
        </div>
        {isLowStock && (
          <span className="text-[9px] font-semibold text-warning leading-none">stock bajo</span>
        )}
      </div>
      <div className="flex items-center gap-px bg-muted/20 rounded-md border border-border/20">
        <button
          className="size-6 flex items-center justify-center rounded-l-md text-muted-foreground hover:bg-muted/50 active:bg-muted/70 transition-colors"
          onClick={() => item.quantity <= 1 ? onRemove(item.id) : onUpdateQuantity(item.id, item.quantity - 1)}
          aria-label={item.quantity <= 1 ? `Eliminar ${item.name}` : `Reducir cantidad de ${item.name}`}
        >
          {item.quantity <= 1 ? <Trash2 className="size-2.5 text-danger" /> : <Minus className="size-2.5" />}
        </button>
        <span className="w-7 text-center text-[11px] font-bold tabular-nums select-none text-foreground">{item.quantity}</span>
        <button
          className="size-6 flex items-center justify-center rounded-r-md text-muted-foreground hover:bg-muted/50 active:bg-muted/70 transition-colors"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          aria-label={`Aumentar cantidad de ${item.name}`}
        >
          <Plus className="size-2.5" />
        </button>
      </div>
      <div className="text-right w-[68px]">
        <span className="text-xs font-bold tabular-nums">{formatMoney(item.price * item.quantity)}</span>
      </div>
    </div>
  );
});

export const Cart = () => {
  const { items, removeItem, updateQuantity } = useCartStore();
  const [recentId, setRecentId] = React.useState<string | null>(null);
  const recentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      setRecentId(null);
      return;
    }
    const last = items[items.length - 1];
    setRecentId(last?.id || null);
    if (recentTimer.current) clearTimeout(recentTimer.current);
    recentTimer.current = setTimeout(() => setRecentId(null), 400);
    return () => {
      if (recentTimer.current) clearTimeout(recentTimer.current);
    };
  }, [items.length]);

  const handleUpdateQuantity = useCallback((id: string, qty: number) => updateQuantity(id, qty), [updateQuantity]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8" role="status">
        <div className="size-8 rounded-lg bg-muted/50 flex items-center justify-center mb-2">
          <ShoppingBag className="size-4 opacity-40" />
        </div>
        <p className="text-xs font-semibold">Carrito vacío</p>
        <p className="text-[10px] font-medium text-muted-foreground/60">Escanee o busque productos</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" role="list" aria-label="Productos en el carrito">
      {items.map((item) => (
        <CartItemRow
          key={item.id}
          item={item}
          isRecent={recentId === item.id}
          onUpdateQuantity={handleUpdateQuantity}
          onRemove={removeItem}
        />
      ))}
    </div>
  );
};
