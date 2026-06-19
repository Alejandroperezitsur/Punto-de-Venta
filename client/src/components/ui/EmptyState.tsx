import React from 'react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
  children?: React.ReactNode;
}

function EmptyState({ icon: Icon, title, description, action, className, children }: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 px-8 text-center',
      'rounded-2xl border-2 border-dashed border-border/60 bg-surface-accent/50',
      className,
    )}>
      {Icon && (
        <div className="size-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-5 border border-primary/10">
          <Icon className="size-7 text-primary/40" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-lg font-bold tracking-tight mb-1.5">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm max-w-sm mb-6 leading-relaxed">{description}</p>
      )}
      {action && (
        <Button variant="primary" size="lg" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
