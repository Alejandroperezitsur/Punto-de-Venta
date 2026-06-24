import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X, CloudOff } from 'lucide-react';
import { cn } from '../../utils/cn';

type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'offline';

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

const ICONS: Record<ToastVariant, React.FC<{ className?: string }>> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  offline: CloudOff,
};

const LEFT_COLORS: Record<ToastVariant, string> = {
  success: 'border-l-semantic-success',
  error: 'border-l-semantic-danger',
  warning: 'border-l-semantic-warning',
  info: 'border-l-semantic-info',
  offline: 'border-l-semantic-warning',
};

const MAX_VISIBLE = 3;

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback(({ message, variant, duration, action }: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    const autoDuration = variant === 'error' || variant === 'offline' ? 0 : (duration ?? 3000);
    setToasts(prev => {
      const next = [...prev, { id, message, variant, duration: autoDuration, action }];
      return next.slice(-MAX_VISIBLE);
    });
    if (autoDuration > 0) {
      const timer = setTimeout(() => removeToast(id), autoDuration);
      timersRef.current.set(id, timer);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[var(--z-toast)] flex flex-col-reverse gap-2 max-w-[360px] w-full pointer-events-none"
        aria-live="polite"
        aria-label="Notificaciones"
      >
        {toasts.map(toast => {
          const Icon = ICONS[toast.variant];
          const iconColor = `text-${toast.variant === 'offline' ? 'semantic-warning' : `semantic-${toast.variant === 'error' ? 'danger' : toast.variant}`}`;
          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto relative flex items-start gap-3 p-3 rounded-lg shadow-dropdown border border-border-default',
                'bg-bg-surface',
                'animate-slide-up',
                LEFT_COLORS[toast.variant],
              )}
              style={{ borderLeftWidth: '3px' }}
            >
              <Icon className={cn('size-4 shrink-0 mt-0.5', iconColor)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{toast.message}</p>
                {toast.action && (
                  <button
                    onClick={toast.action.onClick}
                    className="text-xs font-semibold text-action-primary hover:opacity-80 mt-1 transition-opacity"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="size-5 rounded flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover transition-all shrink-0"
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
