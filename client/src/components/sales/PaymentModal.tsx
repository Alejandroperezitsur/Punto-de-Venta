import React, { useMemo, useState, useEffect } from 'react';
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

const LABELS = ['Pago', 'Confirmar', 'Resultado'];

export const PaymentModal = ({ total, items, onClose, onConfirm, isLoading }) => {
  const [step, setStep] = useState(0);
  const [received, setReceived] = useState(total.toString());
  const [method, setMethod] = useState('cash');
  const [confirmError, setConfirmError] = useState('');

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

  const handleKeypress = (val) => {
    if (val === 'DEL') {
      setReceived(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else if (val === '.') {
      if (!received.includes('.')) setReceived(prev => prev + '.');
    } else {
      setReceived(prev => (prev === '0' || prev === total.toString()) ? val : prev + val);
    }
  };

  const handleProceed = () => { if (isReady) setStep(1); };

  const handleConfirm = async () => {
    setConfirmError('');
    try {
      await onConfirm({
        method,
        amount: receivedNum,
        change: method === 'cash' ? change : 0,
        payments: [{ method, amount: total }],
      });
      setStep(2);
    } catch (e) {
      setConfirmError(e.message || 'Error al procesar el pago');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 z-[100]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="bg-card text-foreground rounded-2xl w-full max-w-5xl h-full sm:h-auto overflow-hidden border border-border shadow-xl flex flex-col md:flex-row"
      >
        {/* Left Panel - Total & Methods */}
        <div className="flex-1 p-6 bg-muted/30 border-r-0 md:border-r border-border flex flex-col justify-between">
          {/* Steps */}
          <div className="flex items-center gap-2 mb-6" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={3}>
            {LABELS.map((label, i) => (
              <React.Fragment key={label}>
                <div className={cn('flex items-center gap-2', i <= step ? 'text-primary' : 'text-muted-foreground/30')}>
                  <div className={cn(
                    'size-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300',
                    i < step ? 'bg-primary text-primary-foreground border-primary' :
                    i === step ? 'bg-primary/10 text-primary border-primary' :
                    'bg-muted text-muted-foreground border-border',
                  )}>
                    {i < step ? <Check className="size-4" /> : i + 1}
                  </div>
                  <span className="text-xs font-semibold hidden sm:inline">{label}</span>
                </div>
                {i < 2 && <div className={cn('flex-1 h-0.5 rounded-full', i < step ? 'bg-primary' : 'bg-border')} />}
              </React.Fragment>
            ))}
          </div>

          <div>
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-black tracking-tighter">COBRO</h2>
              <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all" aria-label="Cerrar">
                <X className="size-6" />
              </button>
            </div>

            <div className="p-6 rounded-3xl bg-card border border-border shadow-lg mb-6">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.15em] mb-1">Total a cobrar</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-muted-foreground">$</span>
                <span className="text-6xl font-black tracking-tighter leading-none">
                  {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                      'h-20 rounded-2xl border-2 font-bold text-sm transition-all flex flex-col items-center justify-center gap-1.5 min-h-[56px]',
                      method === m.id
                        ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-[1.02]'
                        : 'bg-card border-border text-muted-foreground hover:border-muted-foreground/30',
                    )}
                    aria-label={`Pago con ${m.label}`}
                    aria-pressed={method === m.id}
                  >
                    <Icon className="size-6" />
                    <span className="text-[10px] tracking-widest font-bold">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Change display */}
          {(method === 'cash' || method === 'mixed') && (
            <div className={cn(
              'mt-6 p-6 rounded-3xl border-2 transition-all',
              change >= 0
                ? 'bg-success/10 border-success/20 text-success'
                : 'bg-danger/10 border-danger/20 text-danger',
            )}>
              <p className="text-xs font-bold uppercase tracking-[0.15em] opacity-70 mb-1">
                {change >= 0 ? 'Cambio' : 'Falta dinero'}
              </p>
              <p className="text-4xl font-black tracking-tighter">
                ${Math.abs(change).toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* Right Panel - Keypad / Method specific */}
        <div className="flex-1 p-6 flex flex-col gap-4">
          {method === 'cash' ? (
            <>
              <div className="text-right">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">¿Cuánto recibiste?</p>
                <div className="text-5xl font-black text-right p-5 rounded-3xl bg-muted/50 border-2 border-border font-mono">
                  <span className="text-2xl text-muted-foreground/40 mr-1">$</span>{received}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {quickAmounts.map(amt => (
                  <button
                    key={amt}
                    onClick={() => setReceived(amt.toString())}
                    className="h-11 rounded-2xl bg-success/10 text-success border-2 border-success/20 font-bold text-sm hover:bg-success/20 active:scale-95 transition-all min-h-[44px]"
                  >
                    ${amt.toFixed(2)}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 flex-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'DEL'].map(k => (
                  <button
                    key={k}
                    onClick={() => handleKeypress(k === 'DEL' ? 'DEL' : k.toString())}
                    className={cn(
                      'rounded-2xl border-2 border-border text-2xl font-bold transition-all active:scale-90 flex items-center justify-center shadow-sm min-h-[56px]',
                      k === 'DEL' ? 'bg-danger/10 text-danger border-danger/20 text-sm' : 'bg-card hover:bg-muted text-foreground',
                    )}
                    aria-label={k === 'DEL' ? 'Borrar' : k.toString()}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-primary/[0.03] border-2 border-dashed border-primary/20">
              <div className="size-24 rounded-full bg-card flex items-center justify-center mb-6 shadow-xl shadow-primary/10">
                <ArrowRight className="size-12 text-primary" />
              </div>
              <h3 className="text-2xl font-black mb-3">PAGO CON {method.toUpperCase()}</h3>
              <p className="text-base text-muted-foreground font-medium">
                Cobra primero en la terminal bancaria.
              </p>
              <p className="font-black text-4xl mt-6 text-primary">
                TOTAL: ${total.toFixed(2)}
              </p>
            </div>
          )}

          {confirmError && (
            <div className="p-3 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-sm font-bold text-center">
              {confirmError}
            </div>
          )}

          <button
            onClick={handleProceed}
            disabled={!isReady || isLoading}
            className={cn(
              'w-full h-16 text-lg font-black rounded-3xl shadow-lg transition-all flex items-center justify-center gap-3 active:scale-[0.98] min-h-[56px]',
              isReady
                ? 'bg-primary text-primary-foreground hover:brightness-110 shadow-primary/25'
                : 'bg-muted text-muted-foreground/50 cursor-not-allowed',
            )}
            aria-label="Revisar y cobrar"
          >
            <span>COBRAR</span>
            <ArrowRight className="size-7" />
          </button>
        </div>
      </motion.div>

      {/* Confirm step overlay */}
      <AnimatePresence>
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl p-6"
            >
              <div className="text-center mb-6">
                <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="size-8 text-primary" />
                </div>
                <h2 className="text-2xl font-black">Confirmar Cobro</h2>
                <p className="text-muted-foreground mt-1 text-sm">Revisa los datos antes de continuar</p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="bg-muted/30 rounded-2xl p-4 space-y-2 border border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Método</span>
                    <span className="font-bold uppercase">
                      {method === 'cash' ? 'EFECTIVO' : method === 'card' ? 'TARJETA' : method === 'transfer' ? 'TRANSFERENCIA' : 'MIXTO'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-black text-lg">${total.toFixed(2)}</span>
                  </div>
                  {method === 'cash' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Recibido</span>
                      <span className="font-bold">${receivedNum.toFixed(2)}</span>
                    </div>
                  )}
                  {method === 'cash' && change > 0 && (
                    <div className="flex justify-between text-sm pt-2 border-t border-border">
                      <span className="text-success font-bold">Cambio</span>
                      <span className="font-black text-success">${change.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="bg-muted/30 rounded-2xl p-4 max-h-40 overflow-y-auto border border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Productos ({items.length})
                  </p>
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm py-1">
                      <span className="truncate mr-2 font-medium">{item.name} x{item.quantity}</span>
                      <span className="font-bold">${(Number(item.price) * Number(item.quantity)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1 h-14 text-base font-bold rounded-2xl" onClick={() => setStep(0)}>
                  Cancelar
                </Button>
                <Button className="flex-1 h-14 text-base font-bold rounded-2xl bg-success hover:brightness-110 shadow-lg" onClick={handleConfirm} isLoading={isLoading}>
                  {isLoading ? 'Procesando...' : 'Confirmar Pago'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result step overlay */}
      <AnimatePresence>
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="bg-card border border-border w-full max-w-sm rounded-2xl shadow-xl p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.1 }}
                className="size-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="size-12 text-success" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-3xl font-black mb-2">¡Pago Exitoso!</h2>
                <p className="text-muted-foreground text-sm mb-2">Venta completada correctamente</p>
                <p className="font-black text-4xl text-success mb-6">${total.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mb-8">
                  Cambio: ${change.toFixed(2)} — {method === 'cash' ? 'EFECTIVO' : method.toUpperCase()}
                </p>
                <Button
                  className="w-full h-16 text-lg font-black rounded-3xl shadow-lg"
                  onClick={() => { onClose(); setStep(0); setReceived(total.toString()); }}
                >
                  Nueva Venta
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
