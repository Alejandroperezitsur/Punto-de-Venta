import React from 'react';
import { cn } from '../../utils/cn';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

const EmptyState = React.memo(function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {Icon && (
        <div className="size-16 rounded-xl bg-bg-inset border border-dashed border-border-default flex items-center justify-center mb-5">
          <Icon className="size-8 text-text-tertiary" />
        </div>
      )}
      <h3 className="text-base font-semibold text-text-primary mb-1.5">{title}</h3>
      {description && <p className="text-sm text-text-secondary max-w-xs">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-md text-sm font-medium bg-action-primary text-[var(--bg-surface)] hover:bg-action-primary-hover transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
});

const ErrorState = React.memo(function ErrorState({ title, description, onRetry }: {
  title: string; description?: string; onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="size-16 rounded-xl bg-danger-bg border border-dashed border-danger/30 flex items-center justify-center mb-5">
        <AlertCircle className="size-8 text-danger" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1.5">{title}</h3>
      {description && <p className="text-sm text-text-secondary max-w-sm mb-4 font-mono text-xs">{description}</p>}
      {onRetry && (
        <button onClick={onRetry} className="px-4 py-2 rounded-md text-sm font-medium bg-action-primary text-[var(--bg-surface)] hover:bg-action-primary-hover transition-colors">
          Reintentar
        </button>
      )}
    </div>
  );
});

import { AlertCircle } from 'lucide-react';

export { EmptyState, ErrorState };
