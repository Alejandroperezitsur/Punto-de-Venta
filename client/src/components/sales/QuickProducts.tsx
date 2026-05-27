import React, { useState, useEffect, useCallback, memo } from 'react';
import { api } from '../../lib/api';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/ErrorState';
import { cn } from '../../utils/cn';

const QuickProductButton = memo(function QuickProductButton({ product, onSelect }: { product: any; onSelect: (p: any) => void }) {
  const isOutOfStock = product.stock !== undefined && product.stock <= 0;
  const isLowStock = product.stock !== undefined && product.stock <= 5 && product.stock > 0;

  return (
    <button
      onClick={() => !isOutOfStock && onSelect(product)}
      disabled={isOutOfStock}
      className={cn(
        'h-10 rounded-md border border-border/40 bg-card flex items-center gap-1.5 px-2 transition-colors active:brightness-95 text-left',
        'hover:border-primary/40 hover:bg-muted/20',
        isOutOfStock && 'opacity-40 pointer-events-none',
      )}
      title={`${product.name} — $${product.price?.toFixed(2)}`}
      aria-label={`Agregar ${product.name} - $${product.price?.toFixed(2)}`}
    >
      <span className="text-xs font-semibold truncate flex-1">{product.name}</span>
      <span className="text-xs font-bold text-primary shrink-0 tabular-nums">${product.price?.toFixed(2)}</span>
      {isLowStock && (
        <span className="text-[8px] font-semibold text-warning bg-warning/10 px-1 py-px rounded shrink-0">{product.stock}</span>
      )}
    </button>
  );
});

export const QuickProducts = ({ onSelect }: { onSelect: (product: any) => void }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 24;

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

  useEffect(() => {
    load();
  }, [load]);

  const handleRetry = useCallback(() => {
    setPage(1);
    load();
  }, [load]);

  const paginatedProducts = products.slice(0, page * itemsPerPage);
  const hasMore = paginatedProducts.length < products.length;

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-md" />
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

  if (products.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p className="text-xs font-semibold">No hay productos disponibles</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1.5">
        {paginatedProducts.map((p) => (
          <QuickProductButton key={p.id} product={p} onSelect={onSelect} />
        ))}
        {products.length === 0 && (
          <div className="h-10 rounded-md border border-dashed border-border/40 flex items-center justify-center text-[9px] text-muted-foreground/50 font-medium px-2">
            Escanee productos
          </div>
        )}
      </div>
      {hasMore && (
        <button
          onClick={() => setPage(p => p + 1)}
          className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors py-1"
        >
          Ver más ({products.length - paginatedProducts.length} restantes)
        </button>
      )}
    </div>
  );
};
