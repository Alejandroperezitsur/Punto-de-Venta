import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import { Search, Barcode } from 'lucide-react';
import { api } from '../../lib/api';
import { useCartStore } from '../../store/cartStore';
import { useToast } from '../ui/Toast';
import { cn } from '../../utils/cn';

const ProductSearch = memo(function ProductSearch() {
  const [query, setQuery] = useState('');
  const [scanning, setScanning] = useState(false);
  const addItem = useCartStore(s => s.addItem);
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScan = useCallback(async (barcode: string) => {
    setScanning(true);
    try {
      const res = await api(`/products?barcode=${encodeURIComponent(barcode)}`);
      const data = Array.isArray(res) ? res : res?.data || [];
      if (data.length === 1) {
        addItem(data[0]);
        toast(`${data[0].name} agregado`, 'success');
      } else if (data.length > 1) {
        addItem(data[0]);
        toast(`${data[0].name} agregado`, 'success');
      } else {
        toast('Producto no encontrado. Use F4 para agregar manual', 'warning');
        document.dispatchEvent(new CustomEvent('trigger-manual-product'));
      }
    } catch {
      toast('Error al buscar producto', 'error');
    } finally {
      setScanning(false);
      setQuery('');
      if (scanTimer.current) clearTimeout(scanTimer.current);
      scanTimer.current = setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [addItem, toast]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    handleScan(query.trim());
  }, [query, handleScan]);

  useEffect(() => {
    return () => { if (scanTimer.current) clearTimeout(scanTimer.current); };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className={cn(
        'flex items-center rounded-lg border bg-bg-surface transition-all duration-200 h-12',
        scanning
          ? 'border-success/50 ring-2 ring-success/20'
          : 'border-border-default hover:border-border-strong focus-within:border-focus-ring/40 focus-within:ring-2 focus-within:ring-focus-ring/20',
      )}>
        <button
          type="button"
          className="shrink-0 size-12 flex items-center justify-center text-text-tertiary"
          aria-label="Escanear"
        >
          {scanning ? (
            <Barcode className="size-5 text-success animate-pulse" />
          ) : (
            <Search className="size-5" />
          )}
        </button>
        <input
          ref={inputRef}
          data-scan-input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Escanear codigo de barras o buscar producto..."
          className="flex-1 h-full outline-none bg-transparent text-sm font-medium text-text-primary placeholder:text-text-tertiary"
          autoComplete="off"
          autoFocus
        />
        <div className="shrink-0 size-12 flex items-center justify-center text-text-disabled">
          <Search className="size-4 opacity-30" />
        </div>
      </div>
    </form>
  );
});

export { ProductSearch };
