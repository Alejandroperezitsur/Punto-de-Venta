import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

const ConfirmModal = ({ open, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', variant = 'danger', isLoading = false, onConfirm, onCancel }) => {
  if (!open) return null;

  const variantStyles = {
    danger: 'bg-danger hover:brightness-110 text-white',
    warning: 'bg-warning hover:brightness-110 text-white',
    info: 'bg-primary hover:brightness-110 text-white',
  };

  const iconStyles = {
    danger: 'bg-danger/10 text-danger',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-primary/10 text-primary',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
        <button onClick={onCancel} className="float-right p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors" aria-label="Cerrar">
          <X className="size-5" />
        </button>

        <div className="text-center mb-6 mt-2">
          <div className={cn('size-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg', iconStyles[variant])}>
            <AlertTriangle className="size-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground mt-2 text-sm">{message}</p>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1 h-12 text-base font-bold rounded-2xl" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button className={cn('flex-1 h-12 text-base font-bold rounded-2xl shadow-lg', variantStyles[variant])} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export { ConfirmModal };
