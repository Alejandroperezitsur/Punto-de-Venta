import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { api } from '../../lib/api';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/ErrorState';
import { cn } from '../../utils/cn';
import { formatMoney } from '../../utils/format';

const ITEMS_PER_PAGE = 36;
const RECENT_MAX = 8;

interface QuickProduct {
  id: string;
  name: string;
  price: number;
  stock?: number;
  category?: string;
  sales_count?: number;
  barcode?: string;
}

interface QuickProductButtonProps {
  product: QuickProduct;
  onSelect: (p: QuickProduct) => void;
}

const QuickProductButton = memo(function QuickProductButton({ product, onSelect }: QuickProductButtonProps) {
  const isOutOfStock = product.stock !== undefined && product.stock <= 0;
  const isLowStock = product.stock !== undefined && product.stock <= 5 && product.stock > 0;

  return (
    <button
      onClick={() => !isOutOfStock && onSelect(product)}
      disabled={isOutOfStock}
      className={cn(
        'min-h-[var(--touch-target-min)] rounded-md border border-border/30 bg-card flex flex-col justify-center gap-0.5 px-2.5 py-2 transition-all',
        'hover:border-primary/40 hover:bg-muted/20 hover:shadow-sm',
        'active:bg-primary/10 active:border-primary/30 active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        isOutOfStock && 'opacity-30 pointer-events-none',
      )}
      title={`${product.name} — ${formatMoney(product.price)}`}
      aria-label={`Agregar ${product.name} - ${formatMoney(product.price)}`}
    >
      <span className="text-xs font-semibold truncate leading-tight">{product.name}</span>
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-bold text-primary tabular-nums">{formatMoney(product.price)}</span>
        {isLowStock && (
          <span className="text-[9px] font-semibold text-warning bg-warning/10 px-1 py-px rounded shrink-0">{product.stock}</span>
        )}
      </div>
    </button>
  );
});

interface CategorizedSectionProps {
  label: string;
  products: QuickProduct[];
  onSelect: (p: QuickProduct) => void;
}

const CategorizedSection = memo(function CategorizedSection({ label, products, onSelect }: CategorizedSectionProps) {
  return (
    <div className="mb-2">
      <div className="sticky top-0 z-[var(--z-sticky)] bg-card/95 backdrop-blur-sm text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1 py-1 border-b border-border/10">
        {label}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1 mt-1">
        {products.map((p) => (
          <QuickProductButton
            key={p.id}
            product={p}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
});

export const QuickProducts = React.memo(function QuickProducts({ onSelect }: { onSelect: (product: QuickProduct) => void }) {
  const [products, setProducts] = useState<QuickProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [deferredQuery, setDeferredQuery] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<'default' | 'recent' | 'top'>('default');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api('/products', { retries: 1 });
      const list = Array.isArray(data) ? data : data?.data || [];
      setProducts(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSelect = useCallback((p: QuickProduct) => {
    onSelect(p);
    setRecentIds(prev => [p.id, ...prev.filter(id => id !== p.id)].slice(0, RECENT_MAX));
  }, [onSelect]);

  const filteredProducts = useMemo(() => {
    if (!deferredQuery) return products;
    const q = deferredQuery.toLowerCase().trim();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q)
    );
  }, [products, deferredQuery]);

  const { recentProducts, topProducts, restProducts } = useMemo(() => {
    const recent = recentIds
      .map(id => products.find(p => p.id === id))
      .filter(Boolean) as QuickProduct[];
    const sorted = [...products].sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
    const top = sorted.slice(0, 6);
    const rest = products.filter(p => !recentIds.includes(p.id));
    return { recentProducts: recent, topProducts: top, restProducts: rest };
  }, [products, recentIds]);

  const displayProducts = useMemo(() => {
    if (deferredQuery) return filteredProducts;
    if (sortMode === 'recent' && recentProducts.length > 0) return recentProducts;
    if (sortMode === 'top') return topProducts;
    return restProducts;
  }, [deferredQuery, filteredProducts, sortMode, recentProducts, topProducts, restProducts]);

  const paginatedProducts = displayProducts.slice(0, page * ITEMS_PER_PAGE);
  const hasMore = paginatedProducts.length < displayProducts.length;

  const categorizedProducts = useMemo(() => {
    const map = new Map<string, QuickProduct[]>();
    for (const p of paginatedProducts) {
      const cat = p.category || 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return Array.from(map.entries());
  }, [paginatedProducts]);

  const handleRetry = useCallback(() => {
    setPage(1);
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-[var(--touch-target-min)] rounded-md" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Error al cargar productos"
        description={error}
        onRetry={handleRetry}
        variant="default"
      />
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {products.length > 0 && (
        <div className="flex items-center gap-1.5 px-0.5">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => {
              const val = e.target.value;
              setSearchQuery(val);
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => setDeferredQuery(val), 150);
            }}
            placeholder="Buscar productos..."
            className="flex-1 h-[var(--control-sm)] px-2 text-xs rounded-md border border-border/30 bg-card font-medium text-foreground placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/20"
            aria-label="Buscar productos rápidos"
            autoComplete="off"
          />
          <div className="flex gap-0.5">
            <button
              onClick={() => { setSortMode('default'); setPage(1); }}
              className={cn('px-1.5 h-[var(--control-sm)] text-[10px] font-semibold rounded-md border transition-colors touch-target',
                sortMode === 'default' ? 'bg-primary/10 text-primary border-primary/30' : 'border-border/30 text-muted-foreground hover:bg-muted/30')}
            >
              Todos
            </button>
            <button
              onClick={() => { setSortMode('recent'); setPage(1); }}
              className={cn('px-1.5 h-[var(--control-sm)] text-[10px] font-semibold rounded-md border transition-colors touch-target',
                sortMode === 'recent' ? 'bg-primary/10 text-primary border-primary/30' : 'border-border/30 text-muted-foreground hover:bg-muted/30')}
            >
              Recientes
            </button>
            <button
              onClick={() => { setSortMode('top'); setPage(1); }}
              className={cn('px-1.5 h-[var(--control-sm)] text-[10px] font-semibold rounded-md border transition-colors touch-target',
                sortMode === 'top' ? 'bg-primary/10 text-primary border-primary/30' : 'border-border/30 text-muted-foreground hover:bg-muted/30')}
            >
              Top
            </button>
          </div>
        </div>
      )}

      {filteredProducts.length === 0 && deferredQuery && (
        <div className="h-10 flex items-center justify-center text-muted-foreground">
          <p className="text-xs font-medium">Sin resultados para &quot;{deferredQuery}&quot;</p>
        </div>
      )}

      {displayProducts.length === 0 && !searchQuery && (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p className="text-xs font-semibold">No hay productos disponibles</p>
        </div>
      )}

      {deferredQuery ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1">
          {paginatedProducts.map((p) => (
            <QuickProductButton
              key={p.id}
              product={p}
              onSelect={handleSelect}
            />
          ))}
        </div>
      ) : (
        categorizedProducts.map(([cat, prods]) => (
          <CategorizedSection
            key={cat}
            label={cat}
            products={prods}
            onSelect={handleSelect}
          />
        ))
      )}

      {hasMore && !deferredQuery && (
        <button
          onClick={() => setPage(p => p + 1)}
          className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors py-2 touch-target"
        >
          Ver más ({displayProducts.length - paginatedProducts.length} restantes)
        </button>
      )}
    </div>
  );
});

export { QuickProductButton };
export type { QuickProduct };
