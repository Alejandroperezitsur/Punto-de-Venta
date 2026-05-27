import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../ui/Button';
import { X, Check, CreditCard, Banknote, Smartphone, ShoppingBag } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatMoney } from '../../utils/format';

const BILL_AMOUNTS = [20, 50, 100, 200, 500, 1000];

const getQuickAmounts = (total: number): number[] => {
  const exact = total;
  const amounts = [exact];
  for (const bill of BILL_AMOUNTS) {
    const next = Math.ceil(total / bill) * bill;
    if (next > exact && !amounts.includes(next)) amounts.push(next);
  }
  return amounts.filter(a => a >= total).slice(0, 6);
};

export const PaymentModal = ({ total, items, onClose, onConfirm, isLoading }) => {
  const [received, setReceived] = useState(total <= 0 ? '' : total.toString());
  const [method, setMethod] = useState('cash');
  const [confirmError, setConfirmError] = useState('');
  const confirmButtonRef = useRef(null);

  const receivedNum = parseFloat(received) || 0;
  const change = Math.max(0, receivedNum - total);
  const isReady = method !== 'cash' || receivedNum >= total;
  const quickAmounts = useMemo(() => getQuickAmounts(total), [total]);

  const handleKeypress = useCallback((val: string) => {
    if (val === 'DEL') {
      setReceived(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else if (val === '.') {
      setReceived(prev => prev.includes('.') ? prev : prev + '.');
    } else {
      setReceived(prev => (prev === '0' || parseFloat(prev) === total) ? val : prev + val);
    }
  }, [total]);

  const handleConfirm = useCallback(async () => {
    if (!isReady || isLoading) return;
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
      setConfirmError(e.message || 'Error al procesar el pago');
    }
  }, [isReady, isLoading, method, receivedNum, change, total, onConfirm, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isReady) {
        e.preventDefault();
        handleConfirm();
      }
      if (e.key === 'Escape') onClose();
      if (e.key === 'F2') { e.preventDefault(); handleConfirm(); }
      if (/^[0-9]$/.test(e.key)) {
        if (document.activeElement?.tagName !== 'INPUT') handleKeypress(e.key);
      }
      if (e.key === '.') handleKeypress('.');
      if (e.key === 'Backspace') handleKeypress('DEL');
      if (e.key === 'c' || e.key === 'C') setMethod('cash');
      if (e.key === 't' || e.key === 'T') setMethod('card');
      if (e.key === 'r' || e.key === 'R') setMethod('transfer');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReady, handleConfirm, onClose, handleKeypress]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]">
      <div className="bg-card text-foreground rounded-xl w-full max-w-4xl overflow-hidden border border-border shadow-lg flex flex-col md:flex-row max-h-[95vh]">
        {/* Left Panel */}
        <div className="flex-1 p-4 bg-muted/30 border-r-0 md:border-r border-border flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight">Cobro</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors" aria-label="Cerrar">
              <X className="size-4" />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Total</p>
            <p className="text-3xl font-bold tracking-tight tabular-nums">{formatMoney(total)}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'cash', label: 'EFECTIVO', icon: Banknote, key: 'C' },
              { id: 'card', label: 'TARJETA', icon: CreditCard, key: 'T' },
              { id: 'transfer', label: 'TRANSF.', icon: Smartphone, key: 'R' },
              { id: 'mixed', label: 'MIXTO', icon: ShoppingBag },
            ].map(m => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={cn(
                    'h-14 rounded-xl border-2 font-bold text-xs transition-all flex flex-col items-center justify-center gap-1',
                    method === m.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-muted-foreground hover:border-muted-foreground/30',
                  )}
                  aria-label={`Pago con ${m.label}`}
                  aria-pressed={method === m.id}
                >
                  <Icon className="size-5" />
                  <span className="text-[9px] tracking-widest font-bold">{m.label}</span>
                  {m.key && <span className="text-[8px] opacity-50">{m.key}</span>}
                </button>
              );
            })}
          </div>

          {(method === 'cash' || method === 'mixed') && (
            <div className={cn(
              'p-4 rounded-xl border transition-colors',
              change >= 0
                ? 'bg-success/10 border-success/20 text-success'
                : 'bg-danger/10 border-danger/20 text-danger',
            )}>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70 mb-0.5">
                {change >= 0 ? 'Cambio' : 'Falta'}
              </p>
              <p className="text-2xl font-bold tracking-tight tabular-nums">
                {formatMoney(Math.abs(change))}
              </p>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="flex-1 p-4 flex flex-col gap-3">
          {method === 'cash' ? (
            <>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Recibido</p>
                <div className="text-3xl font-bold text-right p-3 rounded-xl bg-muted/50 border border-border font-mono">
                  <span className="text-lg text-muted-foreground/40 mr-1">$</span>{received}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {quickAmounts.map(amt => (
                  <button
                    key={amt}
                    onClick={() => setReceived(amt.toString())}
                    className="h-12 rounded-lg bg-success/10 text-success border border-success/20 font-semibold text-xs hover:bg-success/20 transition-colors"
                  >
                    {formatMoney(amt)}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'DEL'].map(k => (
                  <button
                    key={k}
                    onClick={() => handleKeypress(k === 'DEL' ? 'DEL' : k.toString())}
                    className={cn(
                      'rounded-lg border border-border text-lg font-bold transition-colors flex items-center justify-center shadow-sm',
                      k === 'DEL' ? 'bg-danger/10 text-danger border-danger/20 text-xs h-12' : 'bg-card hover:bg-muted text-foreground h-12',
                    )}
                    aria-label={k === 'DEL' ? 'Borrar' : k.toString()}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 rounded-xl bg-primary/[0.03] border border-dashed border-primary/20">
              <div className="size-14 rounded-full bg-card flex items-center justify-center mb-4">
                <Check className="size-6 text-primary" />
              </div>
              <h3 className="text-base font-bold mb-2">Pago con {method === 'card' ? 'tarjeta' : 'transferencia'}</h3>
              <p className="text-sm text-muted-foreground font-medium">
                {method === 'card' ? 'Cobra primero en la terminal bancaria.' : 'Solicita la transferencia al cliente.'}
              </p>
              <p className="font-bold text-2xl mt-4 text-primary tabular-nums">{formatMoney(total)}</p>
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
            disabled={!isReady || isLoading}
            className={cn(
              'w-full h-14 text-base font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2',
              isReady
                ? 'bg-primary text-primary-foreground hover:brightness-110'
                : 'bg-muted text-muted-foreground/50 cursor-not-allowed',
            )}
            aria-label="Confirmar cobro"
          >
            {isLoading ? (
              <span className="animate-pulse">Procesando...</span>
            ) : (
              <>
                <span>COBRAR</span>
                <span className="text-[10px] opacity-60">Enter</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
