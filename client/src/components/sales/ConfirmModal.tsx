import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '../common/Button';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const variantStyles = {
    danger: 'bg-red-500 hover:bg-red-600',
    warning: 'bg-amber-500 hover:bg-amber-600',
    info: 'bg-blue-500 hover:bg-blue-600',
  };

  const iconStyles = {
    danger: 'bg-red-100 text-red-600',
    warning: 'bg-amber-100 text-amber-600',
    info: 'bg-blue-100 text-blue-600',
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-[var(--card)] w-full max-w-md p-8 rounded-[2rem] shadow-2xl border-4 border-[var(--border)] animate-in fade-in zoom-in duration-200">
        <button
          onClick={onCancel}
          className="absolute top-6 right-6 p-2 hover:bg-red-50 text-red-500 rounded-xl"
          aria-label="Cerrar"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="text-center mb-6">
          <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 ${iconStyles[variant]}`}>
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">{title}</h2>
          <p className="text-[var(--muted-foreground)] mt-2">{message}</p>
        </div>

        <div className="flex gap-4">
          <Button
            variant="secondary"
            className="flex-1 h-14 text-lg font-bold rounded-2xl"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            className={`flex-1 h-14 text-lg font-bold rounded-2xl text-white ${variantStyles[variant]}`}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
