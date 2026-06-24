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
        'rounded-md border text-base font-semibold transition-all duration-100 flex items-center justify-center active:scale-[0.94] haptic-press',
        'min-h-[44px] min-w-[44px]',
        variant === 'danger'
          ? 'bg-semantic-danger-bg text-semantic-danger border-semantic-danger/20'
          : 'bg-bg-surface text-text-primary border-border-subtle hover:bg-bg-surface-hover active:bg-bg-surface-active',
        disabled && 'opacity-40 cursor-not-allowed',
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
        'min-h-[48px] rounded-md border text-sm font-medium transition-all duration-150 flex flex-col items-center justify-center gap-1 active:scale-[0.96]',
        isSelected
          ? 'bg-action-primary text-[hsl(var(--bg-surface))] border-action-primary'
          : 'bg-bg-surface text-text-secondary border-border-subtle hover:border-border-default hover:bg-bg-surface-hover',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
      aria-label={`Pago con ${method.label}`}
      aria-pressed={isSelected}
    >
      <Icon className="size-5" strokeWidth={2} />
      <span className="text-xs font-medium">{method.label}</span>
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
        'min-h-[44px] rounded-md text-xs font-semibold transition-all duration-100 px-3.5 py-2',
        isSelected
          ? 'bg-action-primary/10 text-action-primary border-2 border-action-primary/30'
          : 'bg-bg-inset text-text-secondary border border-border-subtle hover:bg-bg-surface-hover',
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
      <div className="flex flex-col gap-5">
         {/* Total header */}
         <div className="text-center py-5 rounded-lg bg-bg-inset">
           <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Total a pagar</p>
           <p className="text-[var(--text-display)] font-semibold tracking-tight tabular-nums text-text-primary leading-none">{formatMoney(total)}</p>
           <p className="text-xs text-text-tertiary mt-2">{items.length} {items.length === 1 ? 'producto' : 'productos'}</p>
         </div>

        {/* Payment method selection */}
        <div className="grid grid-cols-4 gap-3">
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
            <div className="rounded-lg bg-bg-surface border border-border-subtle p-4">
              <div className="flex justify-between items-baseline mb-3">
                <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Recibido</span>
                {receivedNum > 0 && (
                  <span className="text-xs font-medium text-text-tertiary">
                    {isShort ? `Falta ${formatMoney(total - receivedNum)}` : ''}
                  </span>
                )}
              </div>
              <p className={cn(
                'text-4xl font-semibold tracking-tight tabular-nums',
                receivedNum <= 0 ? 'text-text-disabled' : 'text-text-primary',
              )}>
                <span className="text-text-tertiary mr-1 text-2xl">$</span>{received || '0'}
              </p>
              {receivedNum > 0 && (
                <div className={cn(
                  'mt-4 pt-4 border-t text-right',
                  change >= 0 && !isShort ? 'border-semantic-success/20' : 'border-semantic-danger/20',
                )}>
                  {change > 0 && !isShort && (
                    <div className="rounded-md bg-semantic-success-bg px-3 py-2 inline-block">
                      <span className="text-sm font-bold tabular-nums text-semantic-success">
                        Cambio: {formatMoney(change)}
                      </span>
                    </div>
                  )}
                  {isShort && (
                    <span className="text-sm font-bold tabular-nums text-semantic-danger">
                      Faltan {formatMoney(total - receivedNum)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={exactAmount}
                disabled={submitLocked.current}
                className={cn(
                  'shrink-0 min-h-[44px] rounded-md font-bold text-xs transition-all duration-150 flex items-center justify-center gap-1.5 px-4 active:scale-[0.97]',
                  isExactCash
                    ? 'bg-semantic-success text-[hsl(var(--bg-surface))]'
                    : 'bg-semantic-success-bg text-semantic-success border border-semantic-success/20 hover:bg-semantic-success-bg/80',
                  submitLocked.current && 'opacity-50 cursor-not-allowed',
                )}
              >
                <Check className="size-4" /> Exacto
              </button>
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
            <div className="grid grid-cols-3 gap-2.5 pb-2">
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
          <div className="flex flex-col items-center justify-center text-center py-10 rounded-lg bg-bg-surface border border-dashed border-border-subtle">
            <div className="size-16 rounded-md bg-bg-inset flex items-center justify-center mb-4">
              <Check className="size-7 text-semantic-success" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">Pago con {method === 'card' ? 'tarjeta' : 'transferencia'}</h3>
            <p className="text-xs text-text-secondary font-medium mt-2">
              {method === 'card' ? 'Cobra primero en la terminal.' : 'Solicita la transferencia.'}
            </p>
            <p className="font-semibold text-3xl mt-4 text-text-primary tabular-nums tracking-tight">{formatMoney(total)}</p>
          </div>
        )}

        {confirmError && (
          <div className="p-3 rounded-md bg-semantic-danger-bg border border-semantic-danger/20 text-semantic-danger text-xs font-semibold text-center" role="alert">
            {confirmError}
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={!isReady || submitLocked.current}
          className={cn(
            'w-full min-h-[4.5rem] lg:min-h-[5rem] text-base font-semibold rounded-md transition-all duration-150 flex items-center justify-center gap-2.5 active:scale-[0.98]',
            isReady && !submitLocked.current
              ? 'bg-action-primary text-[hsl(var(--bg-surface))] hover:bg-action-primary-hover'
              : 'bg-bg-inset text-text-disabled cursor-not-allowed',
          )}
          aria-label="Confirmar cobro"
        >
          {submitLocked.current ? (
            <><span className="size-2.5 rounded-full bg-current animate-pulse" />{getButtonLabel()}</>
          ) : (
            <>
              <span className="text-lg">{getButtonLabel()}</span>
              <span className="text-[10px] opacity-50 bg-black/10 px-2 py-0.5 rounded-md tracking-wide font-bold">Enter ↵</span>
            </>
          )}
        </button>
      </div>
    </Modal>
  );
});

export { PaymentModal };
