import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { X, Check, ArrowRight, ShoppingBag, CreditCard, Banknote, Smartphone, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatMoney } from '../../utils/format';

const QUICK_AMOUNTS = (total) => {
  const exact = total;
  const next5 = Math.ceil(total / 5) * 5;
  const next10 = Math.ceil(total / 10) * 10;
  const next50 = Math.ceil(total / 50) * 50;
  const next100 = Math.ceil(total / 100) * 100;
  const next200 = Math.ceil(total / 200) * 200;
  const next500 = Math.ceil(total / 500) * 500;
  return [...new Set([exact, next5, next10, next50, next100, next200, next500])]
    .filter(a => a >= total)
    .sort((a, b) => a - b)
    .slice(0, 5);
};

const fade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.08 } },
  exit: { opacity: 0, transition: { duration: 0.06 } },
};

const slideUp = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.1 } },
  exit: { opacity: 0, y: 2, transition: { duration: 0.08 } },
};

export const PaymentModal = ({ total, items, onClose, onConfirm, isLoading }) => {
  const [step, setStep] = useState(0);
  const [received, setReceived] = useState(total.toString());
  const [method, setMethod] = useState('cash');
  const [confirmError, setConfirmError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const receivedNum = parseFloat(received) || 0;
  const change = Math.max(0, receivedNum - total);
  const isReady = receivedNum >= total || method !== 'cash';
  const quickAmounts = useMemo(() => QUICK_AMOUNTS(total), [total]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (step !== 0) return;
      if (e.key === 'Enter' && isReady) handleProceed();
      if (e.key === 'Escape') onClose();
      if (/[0-9]/.test(e.key)) handleKeypress(e.key);
      if (e.key === '.') handleKeypress('.');
      if (e.key === 'Backspace') handleKeypress('DEL');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [received, isReady, step]);

  const handleKeypress = useCallback((val) => {
    if (val === 'DEL') {
      setReceived(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else if (val === '.') {
      if (!received.includes('.')) setReceived(prev => prev + '.');
    } else {
      setReceived(prev => (prev === '0' || prev === total.toString()) ? val : prev + val);
    }
  }, [received, total]);

  const handleProceed = useCallback(() => {
    if (isReady) setStep(1);
  }, [isReady]);

  const handleConfirm = useCallback(async () => {
    setConfirmError('');
    try {
      await onConfirm({
        method,
        amount: receivedNum,
        change: method === 'cash' ? change : 0,
        payments: [{ method, amount: total }],
      });
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
        setStep(0);
        setReceived(total.toString());
        setShowSuccess(false);
      }, 400);
    } catch (e) {
      setConfirmError(e.message || 'Error al procesar el pago');
    }
  }, [method, receivedNum, change, total, onConfirm, onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]">
      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="bg-card text-foreground rounded-xl w-full max-w-4xl overflow-hidden border border-border shadow-lg flex flex-col md:flex-row max-h-[95vh]"
      >
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
            <p className="text-3xl font-bold tracking-tight">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'cash', label: 'EFECTIVO', icon: Banknote },
              { id: 'card', label: 'TARJETA', icon: CreditCard },
              { id: 'transfer', label: 'TRANSF.', icon: Smartphone },
              { id: 'mixed', label: 'MIXTO', icon: ShoppingBag },
            ].map(m => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={cn(
                    'h-14 rounded-xl border-2 font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 min-h-[48px]',
                    method === m.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-muted-foreground hover:border-muted-foreground/30',
                  )}
                  aria-label={`Pago con ${m.label}`}
                  aria-pressed={method === m.id}
                >
                  <Icon className="size-5" />
                  <span className="text-[9px] tracking-widest font-bold">{m.label}</span>
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
              <p className="text-2xl font-bold tracking-tight">
                ${Math.abs(change).toFixed(2)}
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

              <div className="grid grid-cols-5 gap-1.5">
                {quickAmounts.map(amt => (
                  <button
                    key={amt}
                    onClick={() => setReceived(amt.toString())}
                    className="h-9 rounded-lg bg-success/10 text-success border border-success/20 font-semibold text-xs hover:bg-success/20 active:scale-95 transition-all min-h-[36px]"
                  >
                    ${amt.toFixed(2)}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'DEL'].map(k => (
                  <button
                    key={k}
                    onClick={() => handleKeypress(k === 'DEL' ? 'DEL' : k.toString())}
                    className={cn(
                      'rounded-lg border border-border text-lg font-bold transition-all active:scale-95 flex items-center justify-center shadow-sm min-h-[48px]',
                      k === 'DEL' ? 'bg-danger/10 text-danger border-danger/20 text-xs' : 'bg-card hover:bg-muted text-foreground',
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
                <ArrowRight className="size-6 text-primary" />
              </div>
              <h3 className="text-base font-bold mb-2">Pago con {method === 'card' ? 'tarjeta' : 'transferencia'}</h3>
              <p className="text-sm text-muted-foreground font-medium">
                {method === 'card' ? 'Cobra primero en la terminal bancaria.' : 'Solicita la transferencia al cliente.'}
              </p>
              <p className="font-bold text-2xl mt-4 text-primary">${total.toFixed(2)}</p>
            </div>
          )}

          {confirmError && (
            <div className="p-2 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs font-semibold text-center">
              {confirmError}
            </div>
          )}

          <button
            onClick={handleProceed}
            disabled={!isReady || isLoading}
            className={cn(
              'w-full h-14 text-base font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] min-h-[48px]',
              isReady
                ? 'bg-primary text-primary-foreground hover:brightness-110'
                : 'bg-muted text-muted-foreground/50 cursor-not-allowed',
            )}
            aria-label="Revisar y cobrar"
          >
            <span>COBRAR</span>
            <ArrowRight className="size-5" />
          </button>
        </div>
      </motion.div>

      {/* Confirm overlay - single layer, no nested blur */}
      <AnimatePresence>
        {step === 1 && (
          <motion.div
            variants={fade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110]"
          >
            <motion.div
              variants={slideUp}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-card border border-border w-full max-w-sm rounded-xl shadow-lg p-4 mx-4"
            >
              {showSuccess ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <CheckCircle2 className="size-12 text-success" />
                  <p className="text-lg font-bold mt-2">Pagado</p>
                  <p className="text-sm text-muted-foreground">${total.toFixed(2)}</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <ShoppingBag className="size-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">Confirmar Cobro</h3>
                      <p className="text-xs text-muted-foreground">Revisa antes de continuar</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 border border-border">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Método</span>
                        <span className="font-semibold uppercase">{method === 'cash' ? 'EFECTIVO' : method === 'card' ? 'TARJETA' : method === 'transfer' ? 'TRANSFERENCIA' : 'MIXTO'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-bold">${total.toFixed(2)}</span>
                      </div>
                      {method === 'cash' && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Recibido</span>
                          <span className="font-semibold">${receivedNum.toFixed(2)}</span>
                        </div>
                      )}
                      {method === 'cash' && change > 0 && (
                        <div className="flex justify-between text-xs pt-1.5 border-t border-border">
                          <span className="text-success font-semibold">Cambio</span>
                          <span className="font-bold text-success">${change.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {items.length > 0 && (
                      <div className="bg-muted/30 rounded-lg p-3 border border-border">
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Productos ({items.length})
                        </p>
                        <div className="max-h-24 overflow-y-auto space-y-0.5">
                          {items.slice(0, 8).map(item => (
                            <div key={item.id} className="flex justify-between text-xs py-0.5">
                              <span className="truncate mr-1 font-medium">{item.name} x{item.quantity}</span>
                              <span className="font-semibold shrink-0">${(Number(item.price) * Number(item.quantity)).toFixed(2)}</span>
                            </div>
                          ))}
                          {items.length > 8 && (
                            <p className="text-[9px] text-muted-foreground">+{items.length - 8} más</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="secondary" className="flex-1 h-11 text-sm font-bold rounded-lg" onClick={() => setStep(0)}>
                      Cancelar
                    </Button>
                    <Button className="flex-1 h-11 text-sm font-bold rounded-lg bg-success hover:brightness-110" onClick={handleConfirm} isLoading={isLoading}>
                      {isLoading ? 'Procesando...' : 'Confirmar Pago'}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
