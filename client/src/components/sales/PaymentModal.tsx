import React, { useMemo, useState, useEffect, useCallback, useRef, memo } from 'react';
import { Modal } from '../ui/Modal';
import { Check, CreditCard, Banknote, Smartphone, ShoppingBag } from 'lucide-react';
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
  return Array.from(amounts).sort((a, b) => a - b).slice(0, 6);
};

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Efectivo', icon: Banknote, key: 'C' },
  { id: 'card', label: 'Tarjeta', icon: CreditCard, key: 'T' },
  { id: 'transfer', label: 'Transferencia', icon: Smartphone, key: 'R' },
  { id: 'mixed', label: 'Mixto', icon: ShoppingBag },
] as const;

const PaymentModal = memo(function PaymentModal({ total, items, onClose, onConfirm, isLoading }: {
  total: number;
  items: any[];
  onClose: () => void;
  onConfirm: (data: any) => Promise<void>;
  isLoading: boolean;
}) {
  const [received, setReceived] = useState(total <= 0 ? '' : total.toString());
  const [method, setMethod] = useState('cash');
  const [confirmError, setConfirmError] = useState('');
  const submitLocked = useRef(false);
  const [submitState, setSubmitState] = useState<'idle' | 'locking' | 'saving' | 'done'>('idle');

  const receivedNum = parseFloat(received) || 0;
  const change = Math.max(0, receivedNum - total);
  const isShort = method === 'cash' && receivedNum > 0 && receivedNum < total;
  const isReady = method !== 'cash' || receivedNum >= total;
  const isExactCash = method === 'cash' && receivedNum === total;
  const quickAmounts = useMemo(() => getQuickAmounts(total), [total]);
  const isCashOrMixed = method === 'cash' || method === 'mixed';

  const handleKeypress = useCallback((val: string) => {
    if (submitLocked.current) return;
    if (val === 'DEL') setReceived(prev => prev.length > 1 ? prev.slice(0, -1) : '');
    else if (val === '.') setReceived(prev => prev.includes('.') ? prev : prev + '.');
    else setReceived(prev => (prev === '' || prev === '0') ? val : prev + val);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (submitLocked.current || !isReady) return;
    if (method !== 'cash' && method !== 'mixed' && total <= 0) return;
    submitLocked.current = true;
    setSubmitState('locking');
    setConfirmError('');
    try {
      setSubmitState('saving');
      await onConfirm({
        method,
        amount: receivedNum,
        change: method === 'cash' ? change : 0,
        payments: method === 'mixed'
          ? [{ method: 'cash', amount: receivedNum }, { method: 'card', amount: Math.max(0, total - receivedNum) }]
          : [{ method, amount: total }],
      });
      setSubmitState('done');
      onClose();
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : 'Error al procesar el pago');
      submitLocked.current = false;
      setSubmitState('idle');
    }
  }, [isReady, method, receivedNum, change, total, onConfirm, onClose]);

  const exactAmount = useCallback(() => { setReceived(total.toString()); }, [total]);

  const handleMethodChange = useCallback((m: string) => {
    setMethod(m);
    if (m !== 'cash' && m !== 'mixed') setReceived('');
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = document.activeElement?.tagName === 'INPUT';
      if (e.key === 'Enter' && isReady && !isInputFocused) { e.preventDefault(); handleConfirm(); }
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (/^[0-9]$/.test(e.key) && !isInputFocused) { handleKeypress(e.key); }
      if (e.key === '.' && !isInputFocused) { handleKeypress('.'); }
      if (e.key === 'Backspace' && !isInputFocused) { handleKeypress('DEL'); }
      if ((e.key === 'c' || e.key === 'C') && !isInputFocused) setMethod('cash');
      if ((e.key === 't' || e.key === 'T') && !isInputFocused) setMethod('card');
      if ((e.key === 'r' || e.key === 'R') && !isInputFocused) setMethod('transfer');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReady, handleConfirm, onClose, handleKeypress]);

  const getButtonLabel = () => {
    if (submitState === 'saving') return 'Procesando...';
    if (submitState === 'locking') return 'Preparando...';
    if (isExactCash) return 'Cobrar (Efectivo exacto)';
    return 'Cobrar';
  };

  const numpadKeys = useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'DEL'], []);

  return (
    <Modal open={true} onClose={onClose} size="xl" hideClose={submitLocked.current}>
      <div className="flex flex-col gap-5">
        {/* Total header */}
        <div className="text-center py-5 rounded-xl bg-bg-inset border border-border-subtle">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-2">Total a cobrar</p>
          <p className="text-[var(--text-display)] font-bold tracking-tight tabular-nums text-text-primary leading-none">
            {formatMoney(total)}
          </p>
          <p className="text-xs text-text-tertiary mt-2 font-medium">
            {items.length} {items.length === 1 ? 'producto' : 'productos'}
          </p>
        </div>

        {/* Payment method grid */}
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map(m => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => handleMethodChange(m.id)}
                disabled={submitLocked.current}
                className={cn(
                  'rounded-lg border text-sm font-medium transition-all duration-150 flex flex-col items-center justify-center gap-1.5 py-3 press-effect',
                  method === m.id
                    ? 'bg-action-primary text-[var(--bg-surface)] border-action-primary'
                    : 'bg-bg-surface text-text-secondary border-border-subtle hover:border-border-default hover:bg-bg-surface-hover',
                  submitLocked.current && 'opacity-40 cursor-not-allowed',
                )}
                aria-label={`Pago con ${m.label}`}
                aria-pressed={method === m.id}
              >
                <Icon className="size-5" strokeWidth={2} />
                <span className="text-[10px] font-semibold">{m.label}</span>
              </button>
            );
          })}
        </div>

        {isCashOrMixed && (
          <>
            {/* Received amount */}
            <div className="rounded-xl bg-bg-surface border border-border-subtle p-5">
              <div className="flex justify-between items-baseline mb-3">
                <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Recibido</span>
                {receivedNum > 0 && isShort && (
                  <span className="text-xs font-bold text-danger">Falta {formatMoney(total - receivedNum)}</span>
                )}
              </div>
              <div className={cn(
                'text-5xl font-bold tracking-tight tabular-nums',
                receivedNum <= 0 ? 'text-text-disabled' : 'text-text-primary',
              )}>
                <span className="text-text-tertiary mr-1 text-2xl font-medium">$</span>
                {received || '0'}
              </div>
              {receivedNum > 0 && change > 0 && !isShort && (
                <div className="mt-4 pt-4 border-t border-success/20">
                  <div className="rounded-lg bg-success-bg px-3 py-2 inline-flex items-center gap-2">
                    <Check className="size-4 text-success" />
                    <span className="text-sm font-bold tabular-nums text-success-text">
                      Cambio: {formatMoney(change)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={exactAmount}
                disabled={submitLocked.current}
                className={cn(
                  'shrink-0 rounded-lg font-bold text-xs transition-all duration-150 flex items-center gap-1.5 px-4 py-2.5 press-effect',
                  isExactCash
                    ? 'bg-success text-white'
                    : 'bg-success-bg text-success-text border border-success/20 hover:bg-success/10',
                  submitLocked.current && 'opacity-50 cursor-not-allowed',
                )}
              >
                <Check className="size-3.5" /> Exacto
              </button>
              {quickAmounts.filter(a => Math.abs(a - total) > 0.01).map(amt => (
                <button
                  key={amt}
                  onClick={() => setReceived(amt.toString())}
                  disabled={submitLocked.current}
                  className={cn(
                    'shrink-0 rounded-lg text-xs font-semibold transition-all duration-100 px-4 py-2.5',
                    receivedNum === amt
                      ? 'bg-accent-bg text-accent-text border-2 border-accent/30'
                      : 'bg-bg-inset text-text-secondary border border-border-subtle hover:bg-bg-surface-hover',
                    submitLocked.current && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  {formatMoney(amt)}
                </button>
              ))}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2 pb-1">
              {numpadKeys.map(k => (
                <button
                  key={k}
                  onClick={() => handleKeypress(k === 'DEL' ? 'DEL' : String(k))}
                  disabled={submitLocked.current}
                  className={cn(
                    'rounded-lg border text-lg font-semibold transition-all duration-100 flex items-center justify-center press-effect',
                    'min-h-[48px]',
                    k === 'DEL'
                      ? 'bg-danger-bg text-danger border-danger/20 hover:bg-danger/10'
                      : 'bg-bg-surface text-text-primary border-border-subtle hover:bg-bg-surface-hover active:bg-bg-surface-active',
                    submitLocked.current && 'opacity-40 cursor-not-allowed',
                  )}
                  aria-label={k === 'DEL' ? 'Borrar' : String(k)}
                >
                  {k === 'DEL' ? '\u232B' : k}
                </button>
              ))}
            </div>
          </>
        )}

        {!isCashOrMixed && (
          <div className="flex flex-col items-center justify-center text-center py-12 rounded-xl bg-bg-surface border border-dashed border-border-default">
            <div className="size-16 rounded-xl bg-success-bg flex items-center justify-center mb-4">
              <Check className="size-8 text-success" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">
              Pago con {method === 'card' ? 'tarjeta' : 'transferencia'}
            </h3>
            <p className="text-xs text-text-secondary font-medium mt-2">
              {method === 'card' ? 'Cobra en la terminal bancaria.' : 'Solicita la transferencia.'}
            </p>
            <p className="font-bold text-4xl mt-4 text-text-primary tabular-nums tracking-tight">
              {formatMoney(total)}
            </p>
          </div>
        )}

        {confirmError && (
          <div className="p-3 rounded-lg bg-danger-bg border border-danger/20 text-danger-text text-xs font-semibold text-center" role="alert">
            {confirmError}
          </div>
        )}

        {/* Confirm CTA */}
        <button
          onClick={handleConfirm}
          disabled={!isReady || submitLocked.current}
          className={cn(
            'w-full min-h-[56px] text-base font-semibold rounded-lg transition-all duration-150 flex items-center justify-center gap-3 press-effect',
            isReady && !submitLocked.current
              ? 'bg-action-primary text-[var(--bg-surface)] hover:bg-action-primary-hover'
              : 'bg-bg-inset text-text-disabled cursor-not-allowed',
          )}
          aria-label="Confirmar cobro"
        >
          {submitLocked.current ? (
            <><span className="size-2.5 rounded-full bg-current animate-pulse" />{getButtonLabel()}</>
          ) : (
            <>{getButtonLabel()}</>
          )}
        </button>
      </div>
    </Modal>
  );
});

export { PaymentModal };
