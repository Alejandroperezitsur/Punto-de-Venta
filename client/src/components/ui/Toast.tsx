import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { cn } from '../../utils/cn';

type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'default';

interface ToastData {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

const ToastContext = createContext<{
  toast: (message: string, variant?: ToastVariant, duration?: number) => void;
}>({ toast: () => {} });

const icons: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle, error: AlertCircle, warning: Info, info: Info, default: Info,
};

const colors: Record<ToastVariant, string> = {
  success: 'border-l-success bg-success-bg text-success-text',
  error: 'border-l-danger bg-danger-bg text-danger-text',
  warning: 'border-l-warning bg-warning-bg text-warning-text',
  info: 'border-l-info bg-info-bg text-info-text',
  default: 'border-l-text-secondary bg-bg-surface text-text-primary',
};

let toastId = 0;

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, variant: ToastVariant = 'default', duration = 3500) => {
    const id = String(++toastId);
    setToasts(prev => [...prev.slice(-4), { id, message, variant, duration }]);
    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }
  }, [remove]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[var(--z-toast)] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg border-l-[3px] shadow-dropdown animate-slide-up min-w-[280px] max-w-[400px]',
              colors[t.variant],
            )}
            role="alert"
          >
            {React.createElement(icons[t.variant], { className: 'size-4 shrink-0' })}
            <span className="text-sm font-medium flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function useToast() {
  return useContext(ToastContext).toast;
}

export { ToastProvider, useToast };
