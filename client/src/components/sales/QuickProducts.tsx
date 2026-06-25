import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { api } from '../../lib/api';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/ErrorState';
import { SegmentedControl } from '../ui/SegmentedControl';
import { cn } from '../../utils/cn';
import { formatMoney } from '../../utils/format';
import { Search, TrendingUp, Clock, Grid3X3, ShoppingBag } from 'lucide-react';

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
  image?: string;
}

const QuickProductCard = memo(function QuickProductCard({ product, onSelect }: {
  product: QuickProduct; onSelect: (p: QuickProduct) => void;
}) {
  const isOutOfStock = product.stock !== undefined && product.stock <= 0;
  const isLowStock = product.stock !== undefined && product.stock <= 5 && product.stock > 0;

  return (
    <button
      onClick={() => !isOutOfStock && onSelect(product)}
      disabled={isOutOfStock}
      className={cn(
        'rounded-lg bg-bg-surface border border-border-subtle flex flex-col overflow-hidden',
        'transition-all duration-150 group press-effect',
        'hover:border-accent/40 hover:bg-accent-bg/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/30',
        isOutOfStock && 'opacity-40 cursor-not-allowed',
      )}
      title={`${product.name} - ${formatMoney(product.price)}`}
      aria-label={`${product.name}, ${formatMoney(product.price)}`}
    >
      {/* Product image */}
      <div className="aspect-[4/3] bg-bg-inset flex items-center justify-center overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.name} className="size-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <ShoppingBag className="size-8 text-text-disabled" />
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 flex flex-col gap-1 min-w-0">
        <span className="text-xs font-semibold truncate text-text-primary">{product.name}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-xs text-text-tertiary">$</span>
          <span className="text-base font-bold tabular-nums text-text-primary tracking-tight leading-none">
            {formatMoney(product.price)}
          </span>
        </div>

        {/* Stock indicator */}
        {product.stock !== undefined && product.stock > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            <div className="flex-1 h-1 rounded-full bg-bg-inset overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', isLowStock ? 'bg-warning' : 'bg-success/50')}
                style={{ width: `${Math.min((Math.max(product.stock, 0) / 50) * 100, 100)}%` }}
              />
            </div>
            {isLowStock && (
              <span className="text-[10px] font-bold text-warning-text">{product.stock}</span>
            )}
          </div>
        )}

        {isOutOfStock && (
          <span className="text-[10px] font-bold text-danger-text uppercase tracking-wider mt-0.5">Agotado</span>
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
    const recent = recentIds.map(id => products.find(p => p.id === id)).filter(Boolean) as QuickProduct[];
    const sorted = [...products].sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
    return { recentProducts: recent, topProducts: sorted.slice(0, 8) };
  }, [products, recentIds]);

  const displayProducts = useMemo(() => {
    if (deferredQuery || activeCategory) return filteredProducts;
    if (sortMode === 'recent' && recentProducts.length > 0) return recentProducts;
    if (sortMode === 'top') return topProducts;
    return filteredProducts;
  }, [deferredQuery, activeCategory, filteredProducts, sortMode, recentProducts, topProducts]);

  const paginatedProducts = displayProducts.slice(0, page * ITEMS_PER_PAGE);
  const hasMore = paginatedProducts.length < displayProducts.length;

  const handleRetry = useCallback(() => { setPage(1); load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-1.5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}</div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} variant="card" className="h-[160px]" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Error al cargar productos" description={error} onRetry={handleRetry} />;
  }

  const sortSegments = [
    { key: 'default', label: 'Todos', icon: Grid3X3 },
    { key: 'top', label: 'Top', icon: TrendingUp },
    { key: 'recent', label: 'Recientes', icon: Clock },
  ];

  return (
    <div className="flex flex-col gap-3 h-full">
      {products.length > 0 && (
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex-1 relative max-w-[260px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-tertiary" />
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
              className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-border-subtle bg-bg-inset font-medium text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-focus-ring/20 focus:border-focus-ring/40 transition-all"
              aria-label="Buscar productos"
              autoComplete="off"
            />
          </div>
          <SegmentedControl segments={sortSegments} value={sortMode} onChange={key => { setSortMode(key); setPage(1); }} size="sm" />
        </div>
      )}

      {categories.length > 1 && (
        <div className="relative shrink-0">
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-bg-surface to-transparent z-10 pointer-events-none" />
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 shrink-0 scrollbar-none">
            <button
              onClick={() => { setActiveCategory(null); setPage(1); }}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-150',
                !activeCategory
                  ? 'bg-action-primary text-[var(--bg-surface)]'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover border border-border-subtle',
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
                  'shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-150 truncate max-w-[140px]',
                  activeCategory === cat
                    ? 'bg-action-primary text-[var(--bg-surface)]'
                    : 'text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover border border-border-subtle',
                )}
                title={`${cat} (${count})`}
              >
                {cat}
                <span className="ml-1 text-[9px] opacity-60">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {filteredProducts.length === 0 && deferredQuery && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs font-medium text-text-tertiary">Sin resultados para "{deferredQuery}"</p>
        </div>
      )}

      {displayProducts.length === 0 && !searchQuery && !activeCategory && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs font-semibold text-text-tertiary">No hay productos disponibles</p>
        </div>
      )}

      {displayProducts.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
          {paginatedProducts.map(p => (
            <QuickProductCard key={p.id} product={p} onSelect={handleSelect} />
          ))}
        </div>
      )}

      {hasMore && !deferredQuery && (
        <button
          onClick={() => setPage(p => p + 1)}
          className="text-[10px] font-bold text-text-tertiary hover:text-text-primary transition-colors py-2 uppercase tracking-wider"
        >
          + {displayProducts.length - paginatedProducts.length} mas
        </button>
      )}
    </div>
  );
});
