import React from 'react';
import { cn } from '../../utils/cn';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: string;
  onRetry?: () => void;
  variant?: 'default' | 'danger' | 'warning';
  className?: string;
}

function ErrorState({
  title = 'Algo salió mal',
  description = 'Ocurrió un error al cargar los datos.',
  error,
  onRetry,
  variant = 'default',
  className = '',
}: ErrorStateProps) {
  const variantStyles = {
    default: 'bg-bg-surface',
    danger: 'bg-semantic-danger-bg/50',
    warning: 'bg-semantic-warning-bg/50',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-8 text-center',
        'rounded-lg border border-border-subtle',
        variantStyles[variant],
        className,
      )}
      role="alert"
    >
      <div className={cn(
        'size-14 rounded-lg flex items-center justify-center mb-5',
        variant === 'danger' ? 'bg-semantic-danger-bg' : variant === 'warning' ? 'bg-semantic-warning-bg' : 'bg-bg-inset',
      )}>
        <AlertTriangle className={cn(
          'size-7',
          variant === 'danger' ? 'text-semantic-danger' : variant === 'warning' ? 'text-semantic-warning' : 'text-text-tertiary',
        )} strokeWidth={1.5} />
      </div>
      <h3 className="text-[var(--text-heading-sm)] font-semibold mb-1 text-text-primary">{title}</h3>
      <p className="text-sm text-text-secondary max-w-sm mb-2">{description}</p>
      {error && (
        <p className="text-xs text-text-tertiary max-w-sm mb-5 font-mono bg-bg-inset px-3 py-1.5 rounded-md">
          {error}
        </p>
      )}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          <RefreshCw className="size-4" />
          Reintentar
        </Button>
      )}
    </div>
  );
}

export { ErrorState };
export type { ErrorStateProps };
