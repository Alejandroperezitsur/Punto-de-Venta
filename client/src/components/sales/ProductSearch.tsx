import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Loader2, Plus, ScanLine, WifiOff, AlertCircle, CheckCircle2 } from 'lucide-react';
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
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2500);
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

  const scannerDotColor = () => {
    if (scannerStatus === 'scanning') return 'bg-primary animate-pulse';
    if (scannerStatus === 'error') return 'bg-danger';
    return 'bg-success/50';
  };

  return (
    <div className="relative">
      <form onSubmit={handleSearch} role="search" aria-label="Buscar producto">
        <div className="relative">
          {/* Premium hero scan bar */}
          <div className={cn(
            'flex items-center gap-3 rounded-2xl border-2 bg-card transition-all duration-200',
            'px-4 h-[3.5rem]',
            scannerStatus === 'scanning'
              ? 'border-primary/50 shadow-lg shadow-primary/10'
              : scannerStatus === 'error'
                ? 'border-danger/50 shadow-lg shadow-danger/10'
                : 'border-border/30 focus-within:border-primary/50 focus-within:shadow-lg focus-within:shadow-primary/10',
          )}>
            {/* Animated scanner icon */}
            <div className={cn(
              'shrink-0 transition-all duration-200',
              scannerStatus === 'scanning' ? 'text-primary scale-110' : 'text-muted-foreground/40',
            )}>
              {loading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <ScanLine className={cn('size-5', scannerStatus === 'ready' && 'scan-pulse')} />
              )}
            </div>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              placeholder="Escanear o buscar producto..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (error) setError(''); if (scannerStatus === 'error') setScannerStatus('ready'); }}
              disabled={loading}
              data-scan-input="true"
              aria-label="Buscar o escanear producto"
              autoComplete="off"
              className="flex-1 bg-transparent border-none text-base font-semibold text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:ring-0 disabled:opacity-50"
            />

            {/* Scanner status indicator */}
            {scannerStatus === 'idle' ? (
              <div className="shrink-0" title="Scanner no detectado">
                <WifiOff className="size-4 text-muted-foreground/25" />
              </div>
            ) : (
              <div className={cn(
                'shrink-0 size-2.5 rounded-full transition-colors',
                scannerDotColor(),
                scannerStatus === 'ready' && 'success-pulse',
              )} />
            )}

            {/* Keyboard shortcut hint */}
            <span className="shrink-0 text-[10px] font-bold text-muted-foreground/20 bg-muted/30 px-2 py-1 rounded-lg hidden xl:inline tracking-wider">
              F1
            </span>
          </div>
        </div>
      </form>

      {/* Scan feedback toast */}
      {feedback && (
        <div
          className={cn(
            'absolute top-full left-0 right-0 mt-2 z-[var(--z-dropdown)] animate-fade-up',
            'px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 shadow-md',
            feedback.type === 'success' && 'bg-success/8 border-success/15 text-success',
            feedback.type === 'warning' && 'bg-warning/8 border-warning/15 text-warning',
            feedback.type === 'error' && 'bg-danger/8 border-danger/15 text-danger',
          )}
          role="status"
          aria-live="polite"
        >
          {feedback.type === 'success' && <CheckCircle2 className="size-4 shrink-0" />}
          {feedback.type === 'warning' && <AlertCircle className="size-4 shrink-0" />}
          {feedback.type === 'error' && <AlertCircle className="size-4 shrink-0" />}
          <span className="truncate">{feedback.message}</span>
          {feedback.code && (
            <span className="text-[11px] opacity-50 shrink-0 ml-auto font-mono">{feedback.code}</span>
          )}
          <button
            onClick={clearFeedback}
            className="shrink-0 ml-1 p-1 rounded-lg hover:bg-black/5 touch-target"
            aria-label="Descartar"
          >
            <span className="size-3 block text-center leading-none">&times;</span>
          </button>
        </div>
      )}

      {/* Product not found — quick create */}
      {error && !feedback && (
        <div className="absolute top-full left-0 right-0 mt-2 z-[var(--z-dropdown)] animate-fade-up">
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-warning/8 border border-warning/15 shadow-md">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-10 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
                <Plus className="size-5 text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-warning truncate">Producto no encontrado</p>
                <p className="text-[11px] font-medium text-warning/60 font-mono">{error}</p>
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
