import React, { useState, useCallback } from 'react';
import { Search, Loader2, Plus, Barcode, ScanLine } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useScan } from '../../hooks/useScan';
import { useScanSound } from '../../hooks/useScanSound';
import { api } from '../../lib/api';
import { useCartStore } from '../../store/cartStore';
import { cn } from '../../utils/cn';

export const ProductSearch = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [scannerStatus, setScannerStatus] = useState('ready');
  const addItem = useCartStore(state => state.addItem);
  const { playSuccess, playError, playWarning } = useScanSound();

  const handleScan = useCallback(async (code, qty = 1) => {
    setLoading(true);
    setError('');
    setScannerStatus('scanning');
    try {
      const product = await api(`/products/scan/${encodeURIComponent(code)}`);
      if (product) {
        addItem(product, qty);
        setQuery('');
        setScannerStatus('ready');
        playSuccess();
        if (navigator.vibrate) navigator.vibrate(10);
      }
    } catch {
      setError(code);
      setScannerStatus('ready');
      playWarning();
    } finally {
      setLoading(false);
    }
  }, [addItem, playSuccess, playWarning]);

  useScan(handleScan);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    let code = query;
    let qty = 1;
    const match = query.match(/^(\d+)\*(.+)$/);
    if (match) { qty = parseInt(match[1], 10); code = match[2]; }
    await handleScan(code, qty);
  };

  const handleQuickCreate = async () => {
    if (!error) return;
    setLoading(true);
    try {
      addItem({
        id: `temp-${Date.now()}`,
        name: error,
        price: 0,
        sku: error,
        isNew: true,
        quantity: 1,
      });
      setError('');
      setQuery('');
      playSuccess();
    } finally { setLoading(false); }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSearch} role="search" aria-label="Buscar producto">
        <div className="relative">
          <Input
            icon={scannerStatus === 'scanning' ? Loader2 : scannerStatus === 'ready' ? ScanLine : Barcode}
            scanner
            placeholder="Escanear o buscar producto..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (error) setError(''); }}
            disabled={loading}
            autoFocus
            className={cn(
              loading && 'animate-pulse',
              scannerStatus === 'scanning' && 'border-primary',
            )}
            data-scan-input="true"
            aria-label="Buscar o escanear producto"
          />
          <div className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 size-2 rounded-full transition-colors',
            scannerStatus === 'ready' ? 'bg-success' : scannerStatus === 'scanning' ? 'bg-primary animate-pulse' : 'bg-muted-foreground',
          )} />
        </div>
      </form>

      {error && (
        <div className="absolute top-full left-0 right-0 mt-1 z-10">
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-8 rounded-lg bg-warning/20 flex items-center justify-center shrink-0">
                <Plus className="size-4 text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-warning truncate">Producto no encontrado</p>
                <p className="text-[10px] font-medium text-warning/70">¿Agregarlo?</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="warning"
              onClick={handleQuickCreate}
              className="shrink-0 font-bold text-xs h-8"
              aria-label={`Agregar "${error}" como producto manual`}
            >
              + Agregar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
