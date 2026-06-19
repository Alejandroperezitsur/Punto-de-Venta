import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { api } from '../../lib/api';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/ErrorState';
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
  compact?: boolean;
}

const QuickProductButton = memo(function QuickProductButton({ product, onSelect, compact }: QuickProductButtonProps) {
  const isOutOfStock = product.stock !== undefined && product.stock <= 0;
  const isLowStock = product.stock !== undefined && product.stock <= 5 && product.stock > 0;

  return (
    <button
      onClick={() => !isOutOfStock && onSelect(product)}
      disabled={isOutOfStock}
      className={cn(
        'rounded-xl border bg-card flex flex-col justify-between gap-1.5 transition-all duration-150 group relative overflow-hidden',
        'hover:border-primary/30 hover:bg-primary/[0.02] hover:shadow-sm hover:-translate-y-px',
        'active:bg-primary/[0.04] active:border-primary/20 active:scale-[0.98] active:translate-y-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-1',
        compact
          ? 'min-h-[var(--touch-target-min)] px-3 py-2 border-border/18'
          : 'min-h-[5.5rem] px-3 py-2.5 border-border/22',
        isOutOfStock && 'opacity-20 pointer-events-none',
      )}
      title={`${product.name} — ${formatMoney(product.price)}`}
      aria-label={`Agregar ${product.name} - ${formatMoney(product.price)}`}
    >
      {/* Stock corner indicator */}
      <span className={cn(
        'absolute top-2 right-2 size-1.5 rounded-full transition-colors',
        isOutOfStock ? 'bg-danger' : isLowStock ? 'bg-warning' : 'bg-success/35',
      )} />

      <div className="flex-1 flex flex-col justify-center min-w-0">
        <span className={cn(
          'font-semibold truncate leading-tight text-left text-foreground/90',
          compact ? 'text-xs' : 'text-[13px]',
        )}>{product.name}</span>
        <div className="flex items-center justify-between gap-1 mt-1.5">
          <span className={cn(
            'font-extrabold text-primary tabular-nums leading-none',
            compact ? 'text-xs' : 'text-sm',
          )}>{formatMoney(product.price)}</span>
          {isLowStock && (
            <span className="text-[8px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded-md shrink-0 leading-none">
              {product.stock}
            </span>
          )}
        </div>
      </div>
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
  const [sortMode, setSortMode] = useState<'default' | 'recent' | 'top'>('default');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

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

  // Extract unique categories
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

    // Category filter
    if (activeCategory) {
      result = result.filter(p => (p.category || 'General') === activeCategory);
    }

    // Search filter
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {Array.from({ length: 15 }).map((_, i) => (
            <Skeleton key={i} className="h-[5.5rem] rounded-xl" />
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

  return (
    <div className="flex flex-col gap-2.5 h-full">
      {/* Top toolbar: search + sort tabs */}
      {products.length > 0 && (
        <div className="flex items-center gap-2 shrink-0">
          {/* Search */}
          <div className="flex-1 relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/35" />
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
              className="w-full h-[var(--control-sm)] pl-8 pr-3 text-xs rounded-lg border border-border/18 bg-card font-medium text-foreground placeholder:text-muted-foreground/30 focus-visible:outline-none focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/8 transition-all"
              aria-label="Buscar productos rápidos"
              autoComplete="off"
            />
          </div>

          {/* Sort segmented control */}
          <div className="flex items-center rounded-lg border border-border/15 overflow-hidden shrink-0">
            {[
              { key: 'default', label: 'Todos', icon: Grid3X3 },
              { key: 'top', label: 'Top', icon: TrendingUp },
              { key: 'recent', label: 'Recientes', icon: Clock },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setSortMode(key as typeof sortMode); setPage(1); }}
                className={cn(
                  'flex items-center gap-1 px-2.5 h-[var(--control-sm)] text-[10px] font-bold transition-colors',
                  sortMode === key
                    ? 'bg-primary/8 text-primary'
                    : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/15',
                )}
              >
                <Icon className="size-3" />
                <span className="hidden lg:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category tabs — horizontal scrollable pills */}
      {categories.length > 1 && (
        <div ref={categoryScrollRef} className="flex gap-1 overflow-x-auto pb-0.5 shrink-0 scrollbar-none">
          <button
            onClick={() => { setActiveCategory(null); setPage(1); }}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-150 whitespace-nowrap',
              !activeCategory
                ? 'bg-primary text-primary-foreground shadow-xs shadow-primary/10'
                : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/25 border border-border/15',
            )}
          >
            Todos
            <span className="ml-1.5 text-[9px] opacity-60">{products.length}</span>
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat === activeCategory ? null : cat); setPage(1); }}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-150 truncate max-w-[120px] whitespace-nowrap',
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground shadow-xs shadow-primary/10'
                  : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/25 border border-border/15',
              )}
              title={`${cat} (${count})`}
            >
              {cat}
              <span className="ml-1 text-[9px] opacity-60">{count}</span>
            </button>
          ))}
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

      {/* Product grid */}
      {displayProducts.length > 0 && (
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2'
            : 'flex flex-col gap-1',
        )}>
          {paginatedProducts.map((p) => (
            <QuickProductButton
              key={p.id}
              product={p}
              onSelect={handleSelect}
              compact={viewMode === 'list'}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && !deferredQuery && (
        <button
          onClick={() => setPage(p => p + 1)}
          className="text-[10px] font-bold text-primary/60 hover:text-primary transition-colors py-1.5 touch-target uppercase tracking-wider"
        >
          + {displayProducts.length - paginatedProducts.length} más
        </button>
      )}
    </div>
  );
});

export { QuickProductButton };
export type { QuickProduct };
