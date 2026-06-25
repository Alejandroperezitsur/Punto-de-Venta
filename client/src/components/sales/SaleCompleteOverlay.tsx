import React from 'react';
import { Check } from 'lucide-react';
import { formatMoney } from '../../utils/format';

interface SaleCompleteOverlayProps {
  total: number;
  change: number;
  method: string;
  onDismiss: () => void;
}

export const SaleCompleteOverlay = React.memo(function SaleCompleteOverlay({
  total, change, method, onDismiss,
}: SaleCompleteOverlayProps) {
  const methodLabel =
    method === 'cash' ? 'Efectivo' :
    method === 'card' ? 'Tarjeta' :
    method === 'transfer' ? 'Transferencia' : 'Mixto';

  return (
    <div
      className="fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center bg-black/40"
      onClick={onDismiss}
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-bg-surface rounded-xl shadow-dialog px-12 py-12 text-center max-w-sm animate-scale-in">
        <div className="size-24 rounded-full bg-success-bg flex items-center justify-center mx-auto mb-6">
          <Check className="size-12 text-success" strokeWidth={2.5} />
        </div>
        <p className="text-lg font-bold text-text-primary mb-3">Venta Completada</p>
        <p className="text-[var(--text-display)] font-bold text-text-primary tabular-nums mb-4 leading-none">
          {formatMoney(total)}
        </p>
        {change > 0 && (
          <p className="text-sm font-medium text-text-secondary mb-3">
            Cambio: <span className="text-text-primary font-semibold tabular-nums">{formatMoney(change)}</span>
          </p>
        )}
        <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-bg-inset border border-border-subtle mt-2">
          <span className="text-xs font-medium text-text-secondary">{methodLabel}</span>
        </div>
        <p className="text-xs text-text-tertiary mt-6 font-medium">Toque para continuar</p>
      </div>
    </div>
  );
});
