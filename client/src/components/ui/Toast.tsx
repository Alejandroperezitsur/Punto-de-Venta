import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant, duration?: number, action?: Toast['action']) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors: Record<ToastVariant, string> = {
  success: 'border-success/30 bg-success/10 text-success',
  error: 'border-danger/30 bg-danger/10 text-danger',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  info: 'border-info/30 bg-info/10 text-info',
};

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const toast = useCallback((
    message: string,
    variant: ToastVariant = 'info',
    duration = 4000,
    action?: Toast['action'],
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: Toast = { id, message, variant, duration, action };
    setToasts(prev => [...prev, newToast]);
    if (duration > 0) {
      timers.current.set(id, setTimeout(() => removeToast(id), duration));
    }
  }, [removeToast]);

  useEffect(() => {
    return () => { timers.current.forEach(t => clearTimeout(t)); };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => {
            const Icon = icons[t.variant];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 100, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={cn(
                  'pointer-events-auto flex items-start gap-3 rounded-2xl border-2 p-4 shadow-xl backdrop-blur-xl bg-card/95',
                  colors[t.variant],
                )}
              >
                <Icon className="size-5 shrink-0 mt-0.5" />
                <p className="flex-1 text-sm font-semibold">{t.message}</p>
                {t.action && (
                  <button
                    onClick={t.action.onClick}
                    className="text-sm font-bold underline underline-offset-2 hover:opacity-70 shrink-0"
                  >
                    {t.action.label}
                  </button>
                )}
                <button
                  onClick={() => removeToast(t.id)}
                  className="shrink-0 p-0.5 rounded-md hover:bg-black/5 transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="size-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context.toast;
}

export { ToastProvider, useToast };
export type { ToastVariant, Toast };
