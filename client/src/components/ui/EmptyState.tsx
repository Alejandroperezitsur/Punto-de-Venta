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
      'rounded-3xl border-2 border-dashed border-border bg-card/50',
      className,
    )}>
      {Icon && (
        <div className="size-20 rounded-full bg-muted flex items-center justify-center mb-6 shadow-inner">
          <Icon className="size-10 text-muted-foreground/60" />
        </div>
      )}
      <h3 className="text-2xl font-bold tracking-tight mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground max-w-md mb-6">{description}</p>
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
