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
  const variants = {
    default: 'bg-card',
    danger: 'bg-danger/5',
    warning: 'bg-warning/5',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-8 text-center',
        'rounded-lg border border-border',
        variants[variant],
        className,
      )}
      role="alert"
    >
      <div className={cn(
        'size-14 rounded-2xl flex items-center justify-center mb-5',
        variant === 'danger' ? 'bg-danger/10' : variant === 'warning' ? 'bg-warning/10' : 'bg-muted',
      )}>
        <AlertTriangle className={cn(
          'size-7',
          variant === 'danger' ? 'text-danger' : variant === 'warning' ? 'text-warning' : 'text-muted-foreground/60',
        )} strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-2">{description}</p>
      {error && (
        <p className="text-xs text-muted-foreground/60 max-w-sm mb-5 font-mono bg-muted px-3 py-1.5 rounded-md">
          {error}
        </p>
      )}
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="size-4 mr-2" />
          Reintentar
        </Button>
      )}
    </div>
  );
}

export { ErrorState };
export type { ErrorStateProps };
