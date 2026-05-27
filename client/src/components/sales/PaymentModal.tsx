import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../ui/Button';
import { X, Check, CreditCard, Banknote, Smartphone, ShoppingBag } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatMoney } from '../../utils/format';

const BILL_AMOUNTS = [20, 50, 100, 200, 500, 1000];

const getQuickAmounts = (total: number): number[] => {
  const amounts = new Set<number>();
  for (const bill of BILL_AMOUNTS) {
    const next = Math.ceil(total / bill) * bill;
    if (next >= total) amounts.add(next);
  }
  const roundUp = Math.ceil(total / 100) * 100;
  if (roundUp > total) amounts.add(roundUp);
  const roundUp500 = Math.ceil(total / 500) * 500;
  if (roundUp500 > total) amounts.add(roundUp500);
  return Array.from(amounts).sort((a, b) => a - b).slice(0, 5);
};

export const PaymentModal = ({ total, items, onClose, onConfirm, isLoading }: {
  total: number;
  items: any[];
  onClose: () => void;
  onConfirm: (data: any) => Promise<void>;
  isLoading: boolean;
}) => {
  const [received, setReceived] = useState(total <= 0 ? '' : total.toString());
  const [method, setMethod] = useState('cash');
  const [confirmError, setConfirmError] = useState('');
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const processingRef = useRef(false);

  const receivedNum = parseFloat(received) || 0;
  const change = Math.max(0, receivedNum - total);
  const isShort = method === 'cash' && receivedNum > 0 && receivedNum < total;
  const isReady = method !== 'cash' || receivedNum >= total;
  const quickAmounts = useMemo(() => getQuickAmounts(total), [total]);

  const handleKeypress = useCallback((val: string) => {
    if (processingRef.current) return;
    if (val === 'DEL') {
      setReceived(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else if (val === '.') {
      setReceived(prev => prev.includes('.') ? prev : prev + '.');
    } else {
      setReceived(prev => (prev === '0' || parseFloat(prev) === total || prev === '') ? val : prev + val);
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!isReady || isLoading || processingRef.current || hasConfirmed) return;
    processingRef.current = true;
    setHasConfirmed(true);
    setConfirmError('');
    try {
      await onConfirm({
        method,
        amount: receivedNum,
        change: method === 'cash' ? change : 0,
        payments: [{ method, amount: total }],
      });
      onClose();
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : 'Error al procesar el pago');
      processingRef.current = false;
      setHasConfirmed(false);
    }
  }, [isReady, isLoading, hasConfirmed, method, receivedNum, change, total, onConfirm, onClose]);

  const exactAmount = useCallback(() => {
    setReceived(total.toString());
  }, [total]);

  const isCashOrMixed = method === 'cash' || method === 'mixed';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = document.activeElement?.tagName === 'INPUT';

      if (e.key === 'Enter' && isReady && !isInputFocused) {
        e.preventDefault();
        handleConfirm();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'F2' && !isInputFocused) {
        e.preventDefault();
        handleConfirm();
      }
      if (/^[0-9]$/.test(e.key) && !isInputFocused) {
        handleKeypress(e.key);
      }
      if (e.key === '.' && !isInputFocused) {
        handleKeypress('.');
      }
      if (e.key === 'Backspace' && !isInputFocused) {
        handleKeypress('DEL');
      }
      if ((e.key === 'c' || e.key === 'C') && !isInputFocused) setMethod('cash');
      if ((e.key === 't' || e.key === 'T') && !isInputFocused) setMethod('card');
      if ((e.key === 'r' || e.key === 'R') && !isInputFocused) setMethod('transfer');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReady, handleConfirm, onClose, handleKeypress]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]">
      <div className="bg-card text-foreground rounded-xl w-full max-w-sm border border-border shadow-lg max-h-[95vh] overflow-y-auto">
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight">Cobro</h2>
            <button
              onClick={onClose}
              className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
              aria-label="Cerrar"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="text-center py-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total a pagar</p>
            <p className="text-4xl font-black tracking-tight tabular-nums text-foreground">{formatMoney(total)}</p>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {[
              { id: 'cash', label: 'Efectivo', icon: Banknote, key: 'C' },
              { id: 'card', label: 'Tarjeta', icon: CreditCard, key: 'T' },
              { id: 'transfer', label: 'Transf.', icon: Smartphone, key: 'R' },
              { id: 'mixed', label: 'Mixto', icon: ShoppingBag },
            ].map(m => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={cn(
                    'h-10 rounded-lg border-2 text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5',
                    method === m.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-muted-foreground hover:border-muted-foreground/30',
                  )}
                  aria-label={`Pago con ${m.label}`}
                  aria-pressed={method === m.id}
                >
                  <Icon className="size-4" />
                  <span className="text-[9px] tracking-wide font-bold">{m.label}</span>
                </button>
              );
            })}
          </div>

          {isCashOrMixed && (
            <>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recibido</span>
                  {receivedNum > 0 && (
                    <span className="text-[10px] font-medium text-muted-foreground/60">
                      {isShort ? 'Falta ' + formatMoney(total - receivedNum) : ''}
                    </span>
                  )}
                </div>
                <p className={cn(
                  'text-2xl font-bold tracking-tight tabular-nums font-mono',
                  receivedNum <= 0 ? 'text-muted-foreground/30' : 'text-foreground',
                )}>
                  <span className="text-muted-foreground/40 mr-0.5">$</span>{received || '0'}
                </p>
                {receivedNum > 0 && (
                  <div className={cn(
                    'mt-1.5 pt-1.5 border-t text-right',
                    change >= 0 && !isShort
                      ? 'border-success/20 text-success'
                      : 'border-danger/20 text-danger',
                  )}>
                    <span className="text-sm font-bold tabular-nums">
                      {isShort
                        ? `Faltan ${formatMoney(total - receivedNum)}`
                        : `Cambio: ${formatMoney(change)}`
                      }
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={exactAmount}
                className={cn(
                  'w-full h-11 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2',
                  receivedNum === total
                    ? 'bg-success text-success-foreground shadow-sm'
                    : 'bg-success/10 text-success border border-success/20 hover:bg-success/20',
                )}
              >
                <Check className="size-4" />
                Exacto: {formatMoney(total)}
              </button>

              <div className="grid grid-cols-5 gap-1">
                {quickAmounts.filter(a => Math.abs(a - total) > 0.01).map(amt => (
                  <button
                    key={amt}
                    onClick={() => setReceived(amt.toString())}
                    className={cn(
                      'h-8 rounded-md text-xs font-bold transition-colors',
                      receivedNum === amt
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'bg-muted/40 text-muted-foreground border border-border/40 hover:bg-muted/70',
                    )}
                  >
                    {formatMoney(amt)}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'DEL'].map(k => (
                  <button
                    key={k}
                    onClick={() => handleKeypress(k === 'DEL' ? 'DEL' : k.toString())}
                    className={cn(
                      'rounded-lg border text-base font-bold transition-colors flex items-center justify-center h-10',
                      k === 'DEL'
                        ? 'bg-danger/10 text-danger border-danger/20 text-xs'
                        : 'bg-card border-border text-foreground hover:bg-muted active:bg-muted/70',
                    )}
                    aria-label={k === 'DEL' ? 'Borrar' : k.toString()}
                  >
                    {k === 'DEL' ? '⌫' : k}
                  </button>
                ))}
              </div>
            </>
          )}

          {!isCashOrMixed && (
            <div className="flex flex-col items-center justify-center text-center py-4 rounded-lg bg-primary/[0.03] border border-dashed border-primary/20">
              <div className="size-10 rounded-full bg-card flex items-center justify-center mb-2 border border-border/40">
                <Check className="size-5 text-primary" />
              </div>
              <h3 className="text-sm font-bold">Pago con {method === 'card' ? 'tarjeta' : 'transferencia'}</h3>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                {method === 'card' ? 'Cobra primero en la terminal.' : 'Solicita la transferencia.'}
              </p>
              <p className="font-bold text-xl mt-2 text-primary tabular-nums">{formatMoney(total)}</p>
            </div>
          )}

          {confirmError && (
            <div className="p-2 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs font-semibold text-center">
              {confirmError}
            </div>
          )}

          <button
            ref={confirmButtonRef}
            onClick={handleConfirm}
            disabled={!isReady || isLoading || hasConfirmed}
            className={cn(
              'w-full h-12 text-base font-bold rounded-lg transition-all flex items-center justify-center gap-2',
              isReady && !hasConfirmed
                ? 'bg-primary text-primary-foreground hover:brightness-110 active:brightness-90 shadow-sm'
                : 'bg-muted text-muted-foreground/50 cursor-not-allowed',
              isLoading && 'animate-pulse',
            )}
            aria-label="Confirmar cobro"
          >
            {isLoading || hasConfirmed ? (
              <>
                <span className="size-2 rounded-full bg-current animate-pulse" />
                Procesando...
              </>
            ) : (
              <>
                <span>COBRAR</span>
                <span className="text-[10px] opacity-50 bg-black/10 px-1.5 py-0.5 rounded">Enter</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
