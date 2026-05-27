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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-card w-full max-w-sm rounded-md border border-border shadow-lg p-4">
        <button onClick={onCancel} className="float-right p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors" aria-label="Cerrar">
          <X className="size-4" />
        </button>

        <div className="text-center mb-4 mt-1">
          <div className={cn('size-12 rounded-xl flex items-center justify-center mx-auto mb-3', iconStyles[variant])}>
            <AlertTriangle className="size-6" />
          </div>
          <h2 className="text-base font-bold">{title}</h2>
          <p className="text-muted-foreground mt-1 text-xs">{message}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 h-10 text-sm font-bold rounded-lg" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button className={cn('flex-1 h-10 text-sm font-bold rounded-lg', variantStyles[variant])} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export { ConfirmModal };
