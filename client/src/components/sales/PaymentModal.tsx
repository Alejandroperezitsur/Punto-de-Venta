import React, { useMemo, useState, useEffect, useCallback, useRef, memo } from 'react';
import { Modal } from '../ui/Modal';
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
  return Array.from(amounts).sort((a, b) => a - b).slice(0, 6);
};

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Efectivo', icon: Banknote, key: 'C' },
  { id: 'card', label: 'Tarjeta', icon: CreditCard, key: 'T' },
  { id: 'transfer', label: 'Transf.', icon: Smartphone, key: 'R' },
  { id: 'mixed', label: 'Mixto', icon: ShoppingBag },
] as const;

const NumpadKey = memo(function NumpadKey({ label, onClick, disabled, variant }: {
  label: string | number;
  onClick: () => void;
  disabled: boolean;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-xl border text-base font-bold transition-all duration-75 flex items-center justify-center',
        'min-h-[var(--touch-target-opt)] min-w-[var(--touch-target-opt)]',
        variant === 'danger'
          ? 'bg-danger/8 text-danger border-danger/15 text-sm active:bg-danger/15'
          : 'bg-card border-border/30 text-foreground hover:bg-muted/40 active:bg-muted/60',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
      aria-label={typeof label === 'string' && label === 'DEL' ? 'Borrar' : String(label)}
    >
      {label}
    </button>
  );
});

const PaymentMethodButton = memo(function PaymentMethodButton({ method, isSelected, onClick, disabled }: {
  method: typeof PAYMENT_METHODS[number];
  isSelected: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = method.icon;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'min-h-[var(--touch-target-opt)] rounded-xl border-2 text-xs font-bold transition-all duration-100 flex flex-col items-center justify-center gap-1.5',
        isSelected
          ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/15'
          : 'bg-card border-border/30 text-muted-foreground hover:border-border/60',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
      aria-label={`Pago con ${method.label}`}
      aria-pressed={isSelected}
    >
      <Icon className="size-5" />
      <span className="text-[10px] tracking-wide font-bold">{method.label}</span>
    </button>
  );
});

const QuickAmountButton = memo(function QuickAmountButton({ amount, isSelected, onClick, disabled }: {
  amount: number;
  isSelected: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'min-h-[var(--touch-target-min)] rounded-xl text-xs font-bold transition-all duration-75',
        isSelected
          ? 'bg-primary/15 text-primary border-2 border-primary/30'
          : 'bg-muted/20 text-muted-foreground border border-border/20 hover:bg-muted/40',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {formatMoney(amount)}
    </button>
  );
});

const PaymentModal = memo(function PaymentModal({ total, items, onClose, onConfirm, isLoading }: {
  total: number; items: any[]; onClose: () => void;
  onConfirm: (data: any) => Promise<void>; isLoading: boolean;
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
    if (val === 'DEL') { setReceived(prev => prev.length > 1 ? prev.slice(0, -1) : ''); }
    else if (val === '.') { setReceived(prev => prev.includes('.') ? prev : prev + '.'); }
    else { setReceived(prev => (prev === '' || prev === '0') ? val : prev + val); }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (submitLocked.current || !isReady) return;
    if (method !== 'cash' && method !== 'mixed' && total <= 0) return;
    submitLocked.current = true; setSubmitState('locking');
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
    if (submitState === 'saving') return 'Guardando venta...';
    if (submitState === 'locking') return 'Procesando...';
    if (isExactCash) return 'COBRAR (Efectivo exacto)';
    return 'COBRAR';
  };

  const numpadKeys = useMemo(() => [1,2,3,4,5,6,7,8,9,'.',0,'DEL'], []);

  return (
    <Modal open={true} onClose={onClose} size="xl" hideClose={submitLocked.current}>
      <div className="flex flex-col gap-4">
        {/* Total header */}
        <div className="text-center py-3">
          <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.1em] mb-1.5">Total a pagar</p>
          <p className="text-5xl font-black tracking-tight tabular-nums font-mono text-foreground leading-none">{formatMoney(total)}</p>
          <p className="text-xs text-muted-foreground/40 mt-2">{items.length} {items.length === 1 ? 'producto' : 'productos'}</p>
        </div>

        {/* Payment method selection */}
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map(m => (
            <PaymentMethodButton
              key={m.id}
              method={m}
              isSelected={method === m.id}
              onClick={() => handleMethodChange(m.id)}
              disabled={submitLocked.current}
            />
          ))}
        </div>

        {isCashOrMixed && (
          <>
            {/* Received amount display */}
            <div className="rounded-2xl border border-border/30 bg-surface-inset/50 p-4">
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.08em]">Recibido</span>
                {receivedNum > 0 && (
                  <span className="text-[11px] font-medium text-muted-foreground/50">
                    {isShort ? `Falta ${formatMoney(total - receivedNum)}` : ''}
                  </span>
                )}
              </div>
              <p className={cn(
                'text-3xl font-bold tracking-tight tabular-nums font-mono',
                receivedNum <= 0 ? 'text-muted-foreground/25' : 'text-foreground',
              )}>
                <span className="text-muted-foreground/30 mr-1 text-xl">$</span>{received || '0'}
              </p>
              {receivedNum > 0 && (
                <div className={cn(
                  'mt-3 pt-3 border-t text-right',
                  change >= 0 && !isShort ? 'border-success/15 text-success' : 'border-danger/15 text-danger',
                )}>
                  <span className="text-sm font-bold tabular-nums">
                    {isShort ? `Faltan ${formatMoney(total - receivedNum)}` : `Cambio: ${formatMoney(change)}`}
                  </span>
                </div>
              )}
            </div>

            {/* Exact amount button */}
            <button
              onClick={exactAmount}
              disabled={submitLocked.current}
              className={cn(
                'w-full min-h-[var(--touch-target-opt)] rounded-xl font-bold text-sm transition-all duration-100 flex items-center justify-center gap-2',
                isExactCash
                  ? 'bg-success text-success-foreground shadow-sm shadow-success/15'
                  : 'bg-success/8 text-success border border-success/15 hover:bg-success/15',
                submitLocked.current && 'opacity-50 cursor-not-allowed',
              )}
            >
              <Check className="size-4" /> Exacto: {formatMoney(total)}
            </button>

            {/* Quick amounts */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
              {quickAmounts.filter(a => Math.abs(a - total) > 0.01).map(amt => (
                <QuickAmountButton
                  key={amt}
                  amount={amt}
                  isSelected={receivedNum === amt}
                  onClick={() => setReceived(amt.toString())}
                  disabled={submitLocked.current}
                />
              ))}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-1.5">
              {numpadKeys.map(k => (
                <NumpadKey
                  key={k}
                  label={k === 'DEL' ? '\u232B' : k}
                  onClick={() => handleKeypress(k === 'DEL' ? 'DEL' : k.toString())}
                  disabled={submitLocked.current}
                  variant={k === 'DEL' ? 'danger' : 'default'}
                />
              ))}
            </div>
          </>
        )}

        {!isCashOrMixed && (
          <div className="flex flex-col items-center justify-center text-center py-8 rounded-2xl bg-primary/[0.02] border border-dashed border-primary/15">
            <div className="size-14 rounded-2xl bg-card flex items-center justify-center mb-3 border border-border/30">
              <Check className="size-7 text-primary" />
            </div>
            <h3 className="text-sm font-bold">Pago con {method === 'card' ? 'tarjeta' : 'transferencia'}</h3>
            <p className="text-xs text-muted-foreground/60 font-medium mt-1.5">
              {method === 'card' ? 'Cobra primero en la terminal.' : 'Solicita la transferencia.'}
            </p>
            <p className="font-black text-3xl mt-4 text-primary tabular-nums">{formatMoney(total)}</p>
          </div>
        )}

        {confirmError && (
          <div className="p-3 rounded-xl bg-danger/8 border border-danger/15 text-danger text-xs font-semibold text-center" role="alert">
            {confirmError}
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={!isReady || submitLocked.current}
          className={cn(
            'w-full min-h-[4.5rem] text-base font-extrabold rounded-2xl transition-all duration-100 flex items-center justify-center gap-2 uppercase tracking-wide',
            isReady && !submitLocked.current
              ? 'bg-pos-checkout text-success-foreground hover:brightness-110 active:brightness-90 shadow-md shadow-success/15'
              : 'bg-muted/50 text-muted-foreground/40 cursor-not-allowed',
          )}
          aria-label="Confirmar cobro"
        >
          {submitLocked.current ? (
            <><span className="size-2.5 rounded-full bg-current animate-pulse" />{getButtonLabel()}</>
          ) : (
            <>
              <span>{getButtonLabel()}</span>
              <span className="text-[10px] opacity-40 bg-black/8 px-2 py-0.5 rounded-lg tracking-wider font-bold">Enter</span>
            </>
          )}
        </button>
      </div>
    </Modal>
  );
});

export { PaymentModal };
