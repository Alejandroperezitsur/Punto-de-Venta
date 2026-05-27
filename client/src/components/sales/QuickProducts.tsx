import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../../utils/cn';

export const QuickProducts = ({ onSelect }: { onSelect: (product: any) => void }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api('/products', { retries: 1 });
        const list = Array.isArray(data) ? data : data?.data || [];
        if (!cancelled) setProducts(list.slice(0, 24));
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1.5">
      {products.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p)}
          className={cn(
            'h-10 rounded-md border border-border/40 bg-card hover:border-primary/40 hover:bg-muted/20',
            'flex items-center gap-1.5 px-2 transition-colors active:brightness-95 text-left',
            p.stock !== undefined && p.stock <= 0 && 'opacity-40 pointer-events-none',
          )}
          title={`${p.name} — ${p.price?.toFixed(2)}`}
          aria-label={`Agregar ${p.name} - $${p.price?.toFixed(2)}`}
        >
          <span className="text-xs font-semibold truncate flex-1">{p.name}</span>
          <span className="text-xs font-bold text-primary shrink-0 tabular-nums">${p.price?.toFixed(2)}</span>
          {p.stock !== undefined && p.stock <= 5 && p.stock > 0 && (
            <span className="text-[8px] font-semibold text-warning bg-warning/10 px-1 py-px rounded shrink-0">{p.stock}</span>
          )}
        </button>
      ))}
      <div className="h-10 rounded-md border border-dashed border-border/40 flex items-center justify-center text-[9px] text-muted-foreground/50 font-medium px-2">
        Escanee productos
      </div>
    </div>
  );
};
