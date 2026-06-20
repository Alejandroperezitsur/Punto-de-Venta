import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { api } from '../../lib/api';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/ErrorState';
import { SegmentedControl } from '../ui/SegmentedControl';
import { cn } from '../../utils/cn';
import { formatMoney } from '../../utils/format';
import { Search, TrendingUp, Clock, Grid3X3 } from 'lucide-react';

const ITEMS_PER_PAGE = 40;
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
        'rounded-2xl border bg-card flex flex-col justify-between gap-2 transition-all duration-200 group relative overflow-hidden',
        'hover:border-primary/30 hover:bg-primary/[0.02] hover:shadow-lg hover:-translate-y-1',
        'active:bg-primary/[0.04] active:border-primary/20 active:scale-[0.98] active:translate-y-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-1',
        'min-h-[6.5rem] px-3.5 py-3 border-border/15',
        isOutOfStock && 'pointer-events-none opacity-60',
      )}
      title={`${product.name} — ${formatMoney(product.price)}`}
      aria-label={`Agregar ${product.name} - ${formatMoney(product.price)}`}
    >
      {/* Out of stock overlay */}
      {isOutOfStock && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] flex items-center justify-center z-10 rounded-2xl">
          <span className="text-[10px] font-black text-danger/60 uppercase tracking-widest">Agotado</span>
        </div>
      )}

      {/* Low stock amber dot */}
      {isLowStock && (
        <span
          className="absolute top-2.5 right-2.5 size-2 rounded-full bg-warning shadow-sm shadow-warning/20 ring-1 ring-warning/15 animate-pulse"
          title={`Solo quedan ${product.stock}`}
        />
      )}

      {/* Stock dot for in-stock items */}
      {!isOutOfStock && !isLowStock && (
        <span className="absolute top-2.5 right-2.5 size-1.5 rounded-full bg-success/30" />
      )}

      <div className="flex-1 flex flex-col justify-center min-w-0">
        <span className="font-bold truncate leading-tight text-left text-[13px] text-foreground/90 group-hover:text-foreground transition-colors group-hover:translate-x-0.5 duration-200">
          {product.name}
        </span>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-[10px] font-semibold text-primary/50">$</span>
          <span className="text-base font-black text-primary tabular-nums leading-none tracking-tight">
            {formatMoney(product.price)}
          </span>
        </div>
        {isLowStock && (
          <span className="mt-1.5 text-[8px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded-md w-fit leading-none">
            {product.stock} left
          </span>
        )}
      </div>

      {/* Stock indicator bar at bottom */}
      {product.stock !== undefined && product.stock > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted/20">
          <div
            className={cn(
              'h-full rounded-r-full transition-all duration-300',
              isLowStock ? 'bg-warning' : 'bg-success/40',
            )}
            style={{ width: `${Math.min((product.stock / 50) * 100, 100)}%` }}
          />
        </div>
      )}
    </button>
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
  const [sortMode, setSortMode] = useState<string>('default');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
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

  const categories = useMemo(() => {
    const cats = new Map<string, number>();
    for (const p of products) {
      const cat = p.category || 'General';
      cats.set(cat, (cats.get(cat) || 0) + 1);
    }
    return Array.from(cats.entries()).sort((a, b) => b[1] - a[1]);
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (activeCategory) {
      result = result.filter(p => (p.category || 'General') === activeCategory);
    }
    if (deferredQuery) {
      const q = deferredQuery.toLowerCase().trim();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.id?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, deferredQuery, activeCategory]);

  const { recentProducts, topProducts } = useMemo(() => {
    const recent = recentIds
      .map(id => products.find(p => p.id === id))
      .filter(Boolean) as QuickProduct[];
    const sorted = [...products].sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
    const top = sorted.slice(0, 8);
    return { recentProducts: recent, topProducts: top };
  }, [products, recentIds]);

  const displayProducts = useMemo(() => {
    if (deferredQuery || activeCategory) return filteredProducts;
    if (sortMode === 'recent' && recentProducts.length > 0) return recentProducts;
    if (sortMode === 'top') return topProducts;
    return filteredProducts;
  }, [deferredQuery, activeCategory, filteredProducts, sortMode, recentProducts, topProducts]);

  const paginatedProducts = displayProducts.slice(0, page * ITEMS_PER_PAGE);
  const hasMore = paginatedProducts.length < displayProducts.length;

  const handleRetry = useCallback(() => {
    setPage(1);
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-1.5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-20 rounded-full shrink-0" />)}</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-[6.5rem] rounded-2xl" />
          ))}
        </div>
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

  const sortSegments = [
    { key: 'default', label: 'Todos', icon: Grid3X3 },
    { key: 'top', label: 'Top', icon: TrendingUp },
    { key: 'recent', label: 'Recientes', icon: Clock },
  ];

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Top toolbar: search + sort segmented control */}
      {products.length > 0 && (
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Compact search */}
          <div className="flex-1 relative max-w-[260px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/30" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => {
                const val = e.target.value;
                setSearchQuery(val);
                setPage(1);
                if (debounceRef.current) clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(() => setDeferredQuery(val), 120);
              }}
              placeholder="Buscar en catálogo..."
              className="w-full h-[var(--control-sm)] pl-8 pr-3 text-xs rounded-lg border border-border/15 bg-muted/10 font-medium text-foreground placeholder:text-muted-foreground/30 focus-visible:outline-none focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/8 transition-all"
              aria-label="Buscar productos rápidos"
              autoComplete="off"
            />
          </div>

          {/* SegmentedControl for sort */}
          <SegmentedControl
            segments={sortSegments}
            value={sortMode}
            onChange={(key) => { setSortMode(key); setPage(1); }}
            size="sm"
          />
        </div>
      )}

      {/* Category pills — horizontal scrollable with edge fade */}
      {categories.length > 1 && (
        <div className="relative shrink-0">
          {/* Edge fade */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />
          <div className="flex gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
            <button
              onClick={() => { setActiveCategory(null); setPage(1); }}
              className={cn(
                'shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 whitespace-nowrap',
                !activeCategory
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/15'
                  : 'text-muted-foreground/50 hover:text-foreground hover:bg-muted/25 border border-border/12',
              )}
            >
              Todos
              <span className="ml-1.5 text-[9px] opacity-50 font-bold">{products.length}</span>
            </button>
            {categories.map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat === activeCategory ? null : cat); setPage(1); }}
                className={cn(
                  'shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 truncate max-w-[130px] whitespace-nowrap',
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/15'
                    : 'text-muted-foreground/50 hover:text-foreground hover:bg-muted/25 border border-border/12',
                )}
                title={`${cat} (${count})`}
              >
                {cat}
                <span className="ml-1 text-[9px] opacity-50 font-bold">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty states */}
      {filteredProducts.length === 0 && deferredQuery && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p className="text-xs font-medium">Sin resultados para &quot;{deferredQuery}&quot;</p>
        </div>
      )}

      {displayProducts.length === 0 && !searchQuery && !activeCategory && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p className="text-xs font-semibold">No hay productos disponibles</p>
        </div>
      )}

      {/* Product grid — responsive 2-6 columns */}
      {displayProducts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5">
          {paginatedProducts.map((p) => (
            <QuickProductButton
              key={p.id}
              product={p}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && !deferredQuery && (
        <button
          onClick={() => setPage(p => p + 1)}
          className="text-[10px] font-bold text-primary/50 hover:text-primary transition-colors py-2 touch-target uppercase tracking-wider"
        >
          + {displayProducts.length - paginatedProducts.length} más
        </button>
      )}
    </div>
  );
});

export { QuickProductButton };
export type { QuickProduct };
