import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

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

const ConfirmModal = ({ open, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', variant = 'danger', isLoading = false, onConfirm, onCancel }: ConfirmModalProps) => {
  const confirmVariant = variant === 'danger' ? 'danger' as const : 'primary' as const;
  const iconColors: Record<string, string> = {
    danger: 'bg-semantic-danger-bg text-semantic-danger',
    warning: 'bg-semantic-warning-bg text-semantic-warning',
    info: 'bg-semantic-info-bg text-semantic-info',
  };

  return (
    <Modal open={open} onClose={onCancel} size="sm" hideClose={isLoading}>
      <div className="text-center mb-4 mt-1">
        <div className={cn('size-12 rounded-md flex items-center justify-center mx-auto mb-3', iconColors[variant])}>
          <AlertTriangle className="size-6" />
        </div>
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        <p className="text-text-secondary mt-1 text-xs">{message}</p>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" size="lg" className="flex-1" onClick={onCancel} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button variant={confirmVariant} size="lg" className="flex-1" onClick={onConfirm} isLoading={isLoading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
};

export { ConfirmModal };
export type { ConfirmModalProps };
