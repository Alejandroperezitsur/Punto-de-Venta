import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
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
  success: 'border-l-success bg-success/8 text-success',
  error: 'border-l-danger bg-danger/8 text-danger',
  warning: 'border-l-warning bg-warning/8 text-warning',
  info: 'border-l-info bg-info/8 text-info',
};

const progressColors: Record<ToastVariant, string> = {
  success: 'bg-success/40',
  error: 'bg-danger/40',
  warning: 'bg-warning/40',
  info: 'bg-info/40',
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
    duration = 3000,
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
      <div className={cn(
        'fixed z-[var(--z-toast)] flex flex-col gap-1.5 pointer-events-none',
        'top-3 right-3 max-w-xs w-full',
        'max-sm:bottom-3 max-sm:top-auto max-sm:left-3 max-sm:right-3 max-sm:max-w-none',
      )}>
        {toasts.map(t => {
          const Icon = icons[t.variant];
          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex flex-col rounded-xl border-l-4 border-border bg-card py-2.5 pl-3 pr-2 shadow-md animate-slide-in-right overflow-hidden',
                colors[t.variant],
              )}
              role="alert"
              aria-live="assertive"
            >
              <div className="flex items-start gap-2.5">
                <Icon className="size-4 shrink-0 mt-0.5" />
                <p className="flex-1 text-xs font-semibold leading-tight">{t.message}</p>
                {t.action && (
                  <button
                    onClick={t.action.onClick}
                    className="text-[11px] font-bold underline underline-offset-2 hover:opacity-70 shrink-0 p-1"
                  >
                    {t.action.label}
                  </button>
                )}
                <button
                  onClick={() => removeToast(t.id)}
                  className="shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="size-3" />
                </button>
              </div>
              {t.duration && t.duration > 0 && (
                <div className="mt-2 h-0.5 bg-muted/20 rounded-full overflow-hidden mx-0.5">
                  <div
                    className={cn('h-full rounded-full progress-dismiss', progressColors[t.variant])}
                    style={{ '--dismiss-duration': `${t.duration}ms` } as React.CSSProperties}
                  />
                </div>
              )}
            </div>
          );
        })}
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
