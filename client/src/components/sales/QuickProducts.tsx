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
}

interface QuickProductButtonProps {
  product: QuickProduct;
  onSelect: (p: QuickProduct) => void;
  isFocused: boolean;
}

const QuickProductButton = memo(function QuickProductButton({ product, onSelect, isFocused }: QuickProductButtonProps) {
  const isOutOfStock = product.stock !== undefined && product.stock <= 0;
  const isLowStock = product.stock !== undefined && product.stock <= 5 && product.stock > 0;
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isFocused && ref.current) ref.current.focus({ preventScroll: true });
  }, [isFocused]);

  return (
    <button
      ref={ref}
      onClick={() => !isOutOfStock && onSelect(product)}
      disabled={isOutOfStock}
      className={cn(
        'min-h-[var(--touch-target-min)] rounded-md border border-border/30 bg-card flex items-center gap-1.5 px-2 transition-colors',
        'hover:border-primary/40 hover:bg-muted/20',
        'active:bg-primary/10 active:border-primary/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        isOutOfStock && 'opacity-30 pointer-events-none',
      )}
      title={`${product.name} — ${formatMoney(product.price)}`}
      aria-label={`Agregar ${product.name} - ${formatMoney(product.price)}`}
    >
      <span className="text-xs font-semibold truncate flex-1">{product.name}</span>
      <span className="text-xs font-bold text-primary shrink-0 tabular-nums">{formatMoney(product.price)}</span>
      {isLowStock && (
        <span className="text-[9px] font-semibold text-warning bg-warning/10 px-1 py-px rounded shrink-0">{product.stock}</span>
      )}
    </button>
  );
});

interface CategorizedSectionProps {
  label: string;
  products: QuickProduct[];
  onSelect: (p: QuickProduct) => void;
  focusedIndex: number;
  startIndex: number;
}

const CategorizedSection = memo(function CategorizedSection({ label, products, onSelect, focusedIndex, startIndex }: CategorizedSectionProps) {
  return (
    <div className="mb-1.5">
      <div className="sticky top-0 z-[var(--z-sticky)] bg-card/95 backdrop-blur-sm text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1 py-1 border-b border-border/10">
        {label}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1 mt-1">
        {products.map((p, i) => (
          <QuickProductButton
            key={p.id}
            product={p}
            onSelect={onSelect}
            isFocused={focusedIndex === startIndex + i}
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
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<'default' | 'recent' | 'top'>('default');
  const containerRef = useRef<HTMLDivElement>(null);
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
      p.id?.toLowerCase().includes(q)
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

  const flatProductCount = useMemo(() => {
    return categorizedProducts.reduce((acc, [_, prods]) => acc + prods.length, 0);
  }, [categorizedProducts]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const gridCols = 6;
    let newIndex = focusedIndex;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        newIndex = Math.min(focusedIndex + 1, flatProductCount - 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = Math.max(focusedIndex - 1, 0);
        break;
      case 'ArrowDown':
        e.preventDefault();
        newIndex = Math.min(focusedIndex + gridCols, flatProductCount - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        newIndex = Math.max(focusedIndex - gridCols, 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < paginatedProducts.length) {
          handleSelect(paginatedProducts[focusedIndex]);
        }
        return;
      case 'Escape':
        e.preventDefault();
        setSearchQuery('');
        setDeferredQuery('');
        searchInputRef.current?.blur();
        return;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          setSearchQuery(prev => prev + e.key);
          setFocusedIndex(0);
          return;
        }
        return;
    }

    setFocusedIndex(newIndex);
    const el = containerRef.current?.querySelector(`[data-product-index="${newIndex}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }, [focusedIndex, flatProductCount, paginatedProducts, handleSelect]);

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
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {products.length > 0 && (
        <div className="flex items-center gap-1.5 px-0.5">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => {
              const val = e.target.value;
              setSearchQuery(val);
              setFocusedIndex(0);
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => setDeferredQuery(val), 150);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar productos..."
            className="flex-1 h-[var(--control-sm)] px-2 text-xs rounded-md border border-border/30 bg-card font-medium text-foreground placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/20"
            aria-label="Buscar productos rápidos"
            autoComplete="off"
          />
          <div className="flex gap-0.5">
            <button
              onClick={() => setSortMode('default')}
              className={cn('px-1.5 h-[var(--control-sm)] text-[10px] font-semibold rounded-md border transition-colors touch-target',
                sortMode === 'default' ? 'bg-primary/10 text-primary border-primary/30' : 'border-border/30 text-muted-foreground hover:bg-muted/30')}
            >
              Todos
            </button>
            <button
              onClick={() => setSortMode('recent')}
              className={cn('px-1.5 h-[var(--control-sm)] text-[10px] font-semibold rounded-md border transition-colors touch-target',
                sortMode === 'recent' ? 'bg-primary/10 text-primary border-primary/30' : 'border-border/30 text-muted-foreground hover:bg-muted/30')}
            >
              Recientes
            </button>
            <button
              onClick={() => setSortMode('top')}
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
          <p className="text-xs font-medium">Sin resultados para "{deferredQuery}"</p>
        </div>
      )}

      {displayProducts.length === 0 && !searchQuery && (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p className="text-xs font-semibold">No hay productos disponibles</p>
        </div>
      )}

      {filteredProducts.length > 0 && (
        <div
          className="outline-none"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          aria-label="Lista de productos"
          role="grid"
        >
          {deferredQuery ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1">
              {paginatedProducts.map((p, i) => (
                <div key={p.id} data-product-index={i}>
                  <QuickProductButton
                    product={p}
                    onSelect={handleSelect}
                    isFocused={focusedIndex === i}
                  />
                </div>
              ))}
            </div>
          ) : (
            categorizedProducts.map(([cat, prods]) => (
              <CategorizedSection
                key={cat}
                label={cat}
                products={prods}
                onSelect={handleSelect}
                focusedIndex={focusedIndex}
                startIndex={categorizedProducts
                  .slice(0, categorizedProducts.findIndex(([c]) => c === cat))
                  .reduce((acc, [_, p]) => acc + p.length, 0)}
              />
            ))
          )}
        </div>
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
