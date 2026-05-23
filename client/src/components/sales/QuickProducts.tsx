import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Package } from 'lucide-react';

interface QuickProduct {
  id: string;
  name: string;
  price: number;
  stock?: number;
}

interface QuickProductsProps {
  onSelect: (product: QuickProduct) => void;
}

export const QuickProducts: React.FC<QuickProductsProps> = ({ onSelect }) => {
  const [products, setProducts] = useState<QuickProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api('/products', { retries: 1 });
        const list = Array.isArray(data) ? data : data?.data || [];
        if (!cancelled) setProducts(list.slice(0, 8));
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square bg-[var(--bg-muted)] border border-[var(--border)] rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {products.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="aspect-square bg-[var(--bg-muted)] hover:bg-[var(--secondary)] border border-[var(--border)] rounded-2xl flex flex-col items-center justify-center p-3 transition-all active:scale-95 group shadow-sm min-h-[48px]"
            title={`Agregar ${p.name}`}
            aria-label={`Agregar ${p.name} - $${p.price.toFixed(2)}`}
          >
            <div className="h-12 w-12 bg-white/50 rounded-xl mb-2 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="h-6 w-6 text-[hsl(var(--primary))]" />
            </div>
            <span className="text-xs font-bold text-center line-clamp-2">{p.name}</span>
            <span className="text-sm font-black text-[hsl(var(--primary))] mt-1">${p.price.toFixed(2)}</span>
          </button>
        ))}
        <div className="aspect-square border-2 border-dashed border-[var(--border)] rounded-2xl flex items-center justify-center text-[var(--muted-foreground)] text-xs text-center p-4">
          Escanea productos para verlos aqui
        </div>
      </div>
    </div>
  );
};
