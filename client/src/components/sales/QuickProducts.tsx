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
        if (!cancelled) setProducts(list.slice(0, 10));
      } catch { if (!cancelled) setProducts([]); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {products.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p)}
          className="h-28 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 flex items-center gap-3 p-3 transition-all duration-200 active:scale-[0.98] group min-h-[44px] text-left"
          title={`Agregar ${p.name}`}
          aria-label={`Agregar ${p.name} - $${p.price?.toFixed(2)}`}
        >
          <div className="size-12 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-200">
            <Package className="size-6 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-bold leading-tight line-clamp-2 block">{p.name}</span>
            <span className="text-base font-black text-primary">${p.price?.toFixed(2)}</span>
          </div>
        </button>
      ))}
      <div className="h-28 rounded-2xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-xs text-center p-3 font-medium">
        Escanea productos<br />para verlos aquí
      </div>
    </div>
  );
};
