import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../utils/cn';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: 'border-l-success/70',
  error: 'border-l-danger/70',
  warning: 'border-l-warning/70',
  info: 'border-l-info/70',
};

const BG_COLORS = {
  success: 'bg-success/5',
  error: 'bg-danger/5',
  warning: 'bg-warning/5',
  info: 'bg-info/5',
};

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback(({ message, variant, duration = 4000, action }: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, variant, duration, action }]);
    if (duration > 0) {
      const timer = setTimeout(() => removeToast(id), duration);
      timersRef.current.set(id, timer);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[var(--z-toast)] flex flex-col-reverse gap-2 max-w-sm w-full pointer-events-none"
        aria-live="polite"
        aria-label="Notificaciones"
      >
        {toasts.map(toast => {
          const Icon = ICONS[toast.variant];
          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto relative flex items-start gap-3 p-4 rounded-xl shadow-lg border border-border/40',
                'backdrop-blur-md bg-card/95',
                'animate-slide-up',
                COLORS[toast.variant],
                BG_COLORS[toast.variant],
              )}
              style={{ borderLeftWidth: '3px' }}
            >
              <Icon className={cn(
                'size-4 shrink-0 mt-0.5',
                toast.variant === 'success' && 'text-success',
                toast.variant === 'error' && 'text-danger',
                toast.variant === 'warning' && 'text-warning',
                toast.variant === 'info' && 'text-info',
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{toast.message}</p>
                {toast.action && (
                  <button
                    onClick={toast.action.onClick}
                    className="text-xs font-semibold text-primary hover:text-primary/80 mt-1 transition-colors"
                  >
                    {toast.action.label}
                  </button>
                )}
                {toast.duration && toast.duration > 0 && (
                  <div className="mt-2 h-0.5 rounded-full bg-border/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-foreground/10 progress-dismiss"
                      style={{ '--dismiss-duration': `${toast.duration}ms` } as React.CSSProperties}
                    />
                  </div>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="size-5 rounded flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted/50 transition-all shrink-0"
                aria-label="Cerrar"
              >
                <X className="size-3" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

type UseToastReturn = {
  (message: string, variant?: ToastVariant): void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
};

function useToast(): UseToastReturn {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  const fn = ((message: string, variant: ToastVariant = 'info') => {
    ctx.addToast({ message, variant });
  }) as UseToastReturn;
  fn.addToast = ctx.addToast;
  fn.removeToast = ctx.removeToast;
  return fn;
}

export { ToastProvider, useToast };
export type { Toast, ToastVariant };