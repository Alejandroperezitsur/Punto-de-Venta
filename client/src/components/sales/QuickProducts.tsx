import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Package } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Skeleton } from '../ui/Skeleton';

export const QuickProducts = ({ onSelect }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api('/products', { retries: 1 });
        const list = Array.isArray(data) ? data : data?.data || [];
        if (!cancelled) setProducts(list.slice(0, 15));
      } catch { if (!cancelled) setProducts([]); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
      {products.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p)}
          className="h-20 rounded-lg border border-border bg-card hover:border-primary/40 flex items-center gap-2 p-2 transition-colors active:scale-[0.98] min-h-[44px] text-left"
          title={`Agregar ${p.name}`}
          aria-label={`Agregar ${p.name} - $${p.price?.toFixed(2)}`}
        >
          <div className="size-9 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Package className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold leading-tight line-clamp-2 block">{p.name}</span>
            <span className="text-sm font-bold text-primary">${p.price?.toFixed(2)}</span>
          </div>
        </button>
      ))}
      <div className="h-20 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground text-[10px] text-center p-2 font-medium">
        Escanea productos<br />para verlos aquí
      </div>
    </div>
  );
};
