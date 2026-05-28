import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { api } from '../../lib/api';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/ErrorState';
import { cn } from '../../utils/cn';
import { formatMoney } from '../../utils/format';

const RECENT_MAX = 8;
const LANE_COUNTS = { sm: 2, md: 3, lg: 4, xl: 6 };
const ROW_HEIGHT = 44;

interface QuickProduct {
  id: string;
  name: string;
  price: number;
  stock?: number;
  category?: string;
  sales_count?: number;
}

interface FlatItem {
  type: 'header' | 'product';
  product?: QuickProduct;
  category?: string;
  globalIndex: number;
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

export const QuickProducts = React.memo(function QuickProducts({ onSelect }: { onSelect: (product: QuickProduct) => void }) {
  const [products, setProducts] = useState<QuickProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deferredQuery, setDeferredQuery] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<'default' | 'recent' | 'top'>('default');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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

  const flatItems = useMemo(() => {
    const items: FlatItem[] = [];
    let globalIndex = 0;

    if (deferredQuery) {
      for (const p of displayProducts) {
        items.push({ type: 'product', product: p, globalIndex: globalIndex++ });
      }
    } else {
      const categories = new Map<string, QuickProduct[]>();
      for (const p of displayProducts) {
        const cat = p.category || 'General';
        if (!categories.has(cat)) categories.set(cat, []);
        categories.get(cat)!.push(p);
      }
      for (const [cat, prods] of categories) {
        items.push({ type: 'header', category: cat, globalIndex: globalIndex++ });
        for (const p of prods) {
          items.push({ type: 'product', product: p, globalIndex: globalIndex++ });
        }
      }
    }
    return items;
  }, [displayProducts, deferredQuery]);

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setSearchQuery('');
      setDeferredQuery('');
      searchInputRef.current?.blur();
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      setSearchQuery(prev => prev + e.key);
      return;
    }
  }, []);

  const handleRetry = useCallback(() => {
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
    <div className="flex flex-col gap-1.5 h-full">
      {products.length > 0 && (
        <div className="flex items-center gap-1.5 px-0.5 shrink-0">
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
        <div className="h-10 flex items-center justify-center text-muted-foreground shrink-0">
          <p className="text-xs font-medium">Sin resultados para &quot;{deferredQuery}&quot;</p>
        </div>
      )}

      {displayProducts.length === 0 && !searchQuery && (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p className="text-xs font-semibold">No hay productos disponibles</p>
        </div>
      )}

      {flatItems.length > 0 && (
        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto outline-none"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          aria-label="Lista de productos"
          role="grid"
        >
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
            {virtualizer.getVirtualItems().map(virtualRow => {
              const item = flatItems[virtualRow.index];
              if (item.type === 'header') {
                return (
                  <div
                    key={`header-${item.category}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: virtualRow.size,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="sticky top-0 z-[var(--z-sticky)] bg-card/95 backdrop-blur-sm text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1 py-1 border-b border-border/10">
                      {item.category}
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={item.product!.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '4px',
                    padding: '2px 0',
                  }}
                >
                  <QuickProductButton
                    product={item.product!}
                    onSelect={handleSelect}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

export { QuickProductButton };
export type { QuickProduct };
