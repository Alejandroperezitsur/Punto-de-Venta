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
      <div className="fixed top-3 right-3 z-[200] flex flex-col gap-1 max-w-xs w-full pointer-events-none">
        {toasts.map(t => {
          const Icon = icons[t.variant];
          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex items-start gap-2 rounded-md border-l-4 border-border bg-card py-2 pl-2.5 pr-2 shadow-sm',
                colors[t.variant],
              )}
            >
              <Icon className="size-3.5 shrink-0 mt-0.5" />
              <p className="flex-1 text-xs font-semibold leading-tight">{t.message}</p>
              {t.action && (
                <button
                  onClick={t.action.onClick}
                  className="text-[11px] font-bold underline underline-offset-2 hover:opacity-70 shrink-0"
                >
                  {t.action.label}
                </button>
              )}
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 p-px rounded hover:bg-black/5 transition-colors"
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

function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context.toast;
}

export { ToastProvider, useToast };
export type { ToastVariant, Toast };
