import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { api } from '../../lib/api';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/ErrorState';
import { cn } from '../../utils/cn';
import { formatMoney } from '../../utils/format';
import { Search, Grid3X3, List } from 'lucide-react';

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
        'rounded-xl border bg-card flex flex-col justify-center gap-1 transition-all duration-150',
        'hover:border-primary/35 hover:bg-primary/[0.03] hover:shadow-sm hover:-translate-y-px',
        'active:bg-primary/5 active:border-primary/25 active:scale-[0.98] active:translate-y-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-1',
        compact
          ? 'min-h-[var(--touch-target-min)] px-3 py-2 border-border/20'
          : 'min-h-[5rem] px-3.5 py-3 border-border/25',
        isOutOfStock && 'opacity-25 pointer-events-none',
      )}
      title={`${product.name} — ${formatMoney(product.price)}`}
      aria-label={`Agregar ${product.name} - ${formatMoney(product.price)}`}
    >
      <div className="flex items-start justify-between gap-1 w-full">
        <span className={cn(
          'font-semibold truncate leading-tight text-left',
          compact ? 'text-xs' : 'text-sm',
        )}>{product.name}</span>
        {/* Stock indicator dot */}
        <span className={cn(
          'shrink-0 size-1.5 rounded-full mt-1',
          isOutOfStock ? 'bg-danger' : isLowStock ? 'bg-warning' : 'bg-success/40',
        )} />
      </div>
      <div className="flex items-center justify-between gap-1 w-full">
        <span className={cn(
          'font-bold text-primary tabular-nums',
          compact ? 'text-xs' : 'text-sm',
        )}>{formatMoney(product.price)}</span>
        {isLowStock && (
          <span className="text-[9px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded-md shrink-0">{product.stock}</span>
        )}
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {Array.from({ length: 15 }).map((_, i) => (
          <Skeleton key={i} className="h-[4.5rem] rounded-xl" />
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
    <div className="flex gap-2.5 h-full">
      {/* Category sidebar — vertical tabs */}
      {categories.length > 1 && (
        <div className="shrink-0 w-24 flex flex-col gap-0.5 overflow-y-auto pr-1.5 pb-2">
          <button
            onClick={() => { setActiveCategory(null); setPage(1); }}
            className={cn(
              'w-full text-left px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all duration-150',
              !activeCategory
                ? 'bg-primary/10 text-primary shadow-xs shadow-primary/5'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30',
            )}
          >
            Todos
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat === activeCategory ? null : cat); setPage(1); }}
              className={cn(
                'w-full text-left px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all duration-150 truncate',
                activeCategory === cat
                  ? 'bg-primary/10 text-primary shadow-xs shadow-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30',
              )}
              title={`${cat} (${count})`}
            >
              {cat}
              <span className="block text-[9px] font-medium opacity-50 mt-px">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main catalog area */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {/* Toolbar: search + sort + view toggle */}
        {products.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/40" />
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
                placeholder="Buscar..."
                className="w-full h-[var(--control-sm)] pl-8 pr-3 text-xs rounded-lg border border-border/20 bg-card font-medium text-foreground placeholder:text-muted-foreground/35 focus-visible:outline-none focus-visible:border-ring/30 focus-visible:ring-1 focus-visible:ring-ring/10 transition-all"
                aria-label="Buscar productos rápidos"
                autoComplete="off"
              />
            </div>
            <div className="flex gap-0.5">
              <button
                onClick={() => { setSortMode('default'); setPage(1); }}
                className={cn('px-2 h-[var(--control-sm)] text-[10px] font-semibold rounded-lg border transition-colors',
                  sortMode === 'default' ? 'bg-primary/6 text-primary border-primary/15' : 'border-border/15 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/20')}
              >
                Todos
              </button>
              <button
                onClick={() => { setSortMode('top'); setPage(1); }}
                className={cn('px-2 h-[var(--control-sm)] text-[10px] font-semibold rounded-lg border transition-colors',
                  sortMode === 'top' ? 'bg-primary/6 text-primary border-primary/15' : 'border-border/15 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/20')}
              >
                Top
              </button>
              <button
                onClick={() => { setSortMode('recent'); setPage(1); }}
                className={cn('px-2 h-[var(--control-sm)] text-[10px] font-semibold rounded-lg border transition-colors',
                  sortMode === 'recent' ? 'bg-primary/6 text-primary border-primary/15' : 'border-border/15 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/20')}
              >
                Recientes
              </button>
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
            className="text-[11px] font-semibold text-primary/70 hover:text-primary transition-colors py-1.5 touch-target"
          >
            + {displayProducts.length - paginatedProducts.length} más
          </button>
        )}
      </div>
    </div>
  );
});

export { QuickProductButton };
export type { QuickProduct };
