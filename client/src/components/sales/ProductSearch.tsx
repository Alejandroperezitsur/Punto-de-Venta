import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Loader2, Plus, ScanLine, WifiOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useScan } from '../../hooks/useScan';
import { useScanSound } from '../../hooks/useScanSound';
import { useScannerFocusEngine } from '../../hooks/useScannerFocusEngine';
import { api } from '../../lib/api';
import { useCartStore } from '../../store/cartStore';
import { cn } from '../../utils/cn';

interface ScanFeedback {
  type: 'success' | 'error' | 'warning';
  message: string;
  code?: string;
}

const ProductSearch = React.memo(function ProductSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [scannerStatus, setScannerStatus] = useState<'ready' | 'scanning' | 'error' | 'idle'>('ready');
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingScans = useRef(0);
  const addItem = useCartStore(state => state.addItem);
  const { playSuccess, playWarning, playError } = useScanSound();
  const { restoreAfterModal, forceFocusToScanner, isScanInputFocused } = useScannerFocusEngine();

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
      inputRef.current.select();
    }
  }, []);

  const clearFeedback = useCallback(() => {
    setFeedback(null);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
  }, []);

  const showFeedback = useCallback((fb: ScanFeedback) => {
    clearFeedback();
    setFeedback(fb);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2000);
  }, [clearFeedback]);

  useEffect(() => {
    const t = setTimeout(focusInput, 50);
    return () => clearTimeout(t);
  }, [focusInput]);

  const scanCounter = useRef(0);

  const handleScan = useCallback(async (code: string, qty = 1) => {
    pendingScans.current++;
    const scanId = ++scanCounter.current;
    setLoading(true);
    setError('');
    setScannerStatus('scanning');

    try {
      const product = await api(`/products/scan/${encodeURIComponent(code)}`, { retries: 1 });
      if (scanId !== scanCounter.current) return;

      if (product) {
        addItem(product, qty);
        setQuery('');
        setScannerStatus('ready');
        playSuccess();
        if (navigator.vibrate) navigator.vibrate(15);
        showFeedback({ type: 'success', message: product.name, code });
      }
    } catch (err) {
      if (scanId !== scanCounter.current) return;
      const msg = err instanceof Error ? err.message : String(err);
      if (/not found|404/i.test(msg)) {
        setError(code);
        setScannerStatus('error');
        playWarning();
        showFeedback({ type: 'warning', message: 'Producto no encontrado', code });
      } else {
        setScannerStatus('error');
        playError();
        showFeedback({ type: 'error', message: 'Error de conexión', code });
      }
    } finally {
      pendingScans.current--;
      if (pendingScans.current <= 0) {
        setLoading(false);
      }
      forceFocusToScanner('scan');
    }
  }, [addItem, playSuccess, playWarning, playError, showFeedback, forceFocusToScanner]);

  const onScannerIdle = useCallback(() => {
    setScannerStatus('idle');
  }, []);

  useScan(handleScan, onScannerIdle, {
    minLength: 3,
    timeout: 80,
    dedupWindow: 350,
    idleTimeout: 5000,
  });

  useEffect(() => {
    if (scannerStatus === 'idle' || scannerStatus === 'ready') return;
    const t = setTimeout(() => setScannerStatus('ready'), 2000);
    return () => clearTimeout(t);
  }, [scannerStatus]);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
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
      showFeedback({ type: 'success', message: `"${error}" agregado como producto manual` });
    } finally {
      setLoading(false);
      focusInput();
    }
  }, [error, addItem, playSuccess, showFeedback, focusInput]);

  const scannerIndicator = () => {
    if (scannerStatus === 'scanning') return 'bg-primary animate-pulse';
    if (scannerStatus === 'error') return 'bg-danger';
    return 'bg-muted-foreground/30';
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
            onChange={(e) => { setQuery(e.target.value); if (error) setError(''); if (scannerStatus === 'error') setScannerStatus('ready'); }}
            disabled={loading}
            className={cn(
              loading && 'animate-pulse',
              scannerStatus === 'scanning' && 'border-primary',
              scannerStatus === 'error' && 'border-danger',
            )}
            data-scan-input="true"
            aria-label="Buscar o escanear producto"
            autoComplete="off"
          />
          {scannerStatus === 'idle' ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2" title="Scanner no detectado">
              <WifiOff className="size-4 text-muted-foreground/50" />
            </div>
          ) : (
            <div className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 size-2.5 rounded-full transition-colors',
              scannerIndicator(),
            )} />
          )}
        </div>
      </form>

      {feedback && (
        <div
          className={cn(
            'absolute top-full left-0 right-0 mt-1 z-[var(--z-dropdown)] animate-in',
            'px-2 py-1.5 rounded-md border text-xs font-semibold flex items-center gap-1.5',
            feedback.type === 'success' && 'bg-success/10 border-success/20 text-success',
            feedback.type === 'warning' && 'bg-warning/10 border-warning/20 text-warning',
            feedback.type === 'error' && 'bg-danger/10 border-danger/20 text-danger',
          )}
          role="status"
          aria-live="polite"
        >
          {feedback.type === 'success' && <CheckCircle2 className="size-3 shrink-0" />}
          {feedback.type === 'warning' && <AlertCircle className="size-3 shrink-0" />}
          {feedback.type === 'error' && <AlertCircle className="size-3 shrink-0" />}
          <span className="truncate">{feedback.message}</span>
          {feedback.code && (
            <span className="text-[10px] opacity-60 shrink-0 ml-auto font-mono">{feedback.code}</span>
          )}
          <button
            onClick={clearFeedback}
            className="shrink-0 ml-1 p-1 rounded hover:bg-black/10 touch-target"
            aria-label="Descartar"
          >
            <span className="size-3 block text-center leading-none">&times;</span>
          </button>
        </div>
      )}

      {error && !feedback && (
        <div className="absolute top-full left-0 right-0 mt-1 z-[var(--z-dropdown)]">
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-warning/10 border border-warning/20">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-8 rounded-md bg-warning/20 flex items-center justify-center shrink-0">
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
              className="shrink-0 font-bold text-xs h-[var(--control-sm)]"
              aria-label={`Agregar "${error}" como producto manual`}
            >
              + Agregar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

export { ProductSearch };
