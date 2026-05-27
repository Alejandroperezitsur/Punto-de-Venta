import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Loader2, Plus, ScanLine, WifiOff } from 'lucide-react';
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
  const [isScannerIdle, setIsScannerIdle] = useState(false);
  const inputRef = useRef(null);
  const addItem = useCartStore(state => state.addItem);
  const { playSuccess, playWarning } = useScanSound();

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput]);

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
      setScannerStatus('error');
      playWarning();
    } finally {
      setLoading(false);
      focusInput();
    }
  }, [addItem, playSuccess, playWarning, focusInput]);

  const onScannerIdle = useCallback(() => {
    setIsScannerIdle(true);
    setScannerStatus('idle');
  }, []);

  useScan(handleScan, onScannerIdle);

  useEffect(() => {
    if (scannerStatus === 'idle' || scannerStatus === 'ready') return;
    const t = setTimeout(() => setIsScannerIdle(false), 3000);
    return () => clearTimeout(t);
  }, [scannerStatus]);

  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    let code = query;
    let qty = 1;
    const match = query.match(/^(\d{1,3})\*(.+)$/);
    if (match) { qty = parseInt(match[1], 10); code = match[2]; }
    await handleScan(code, qty);
  }, [query, handleScan]);

  const handleQuickCreate = useCallback(async () => {
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
    } finally {
      setLoading(false);
      focusInput();
    }
  }, [error, addItem, playSuccess, focusInput]);

  const scannerIndicator = () => {
    if (isScannerIdle) return 'bg-warning animate-pulse';
    if (scannerStatus === 'scanning') return 'bg-primary animate-pulse';
    if (scannerStatus === 'error') return 'bg-danger';
    return 'bg-success';
  };

  return (
    <div className="relative">
      <form onSubmit={handleSearch} role="search" aria-label="Buscar producto">
        <div className="relative">
          <Input
            ref={inputRef}
            icon={loading ? Loader2 : ScanLine}
            scanner
            placeholder="Escanear o buscar producto..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (error) setError(''); if (isScannerIdle) setIsScannerIdle(false); }}
            disabled={loading}
            className={cn(
              loading && 'animate-pulse',
              scannerStatus === 'scanning' && 'border-primary',
              scannerStatus === 'error' && 'border-danger',
            )}
            data-scan-input="true"
            aria-label="Buscar o escanear producto"
          />
          {isScannerIdle ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2" title="Scanner no detectado">
              <WifiOff className="size-4 text-warning" />
            </div>
          ) : (
            <div className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 size-2.5 rounded-full transition-colors',
              scannerIndicator(),
            )} />
          )}
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
                <p className="text-[10px] font-medium text-warning/70">Código: {error}</p>
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
