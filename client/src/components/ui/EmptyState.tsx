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
      'rounded-2xl border-2 border-dashed border-border bg-card/50',
      className,
    )}>
      {Icon && (
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-5">
          <Icon className="size-8 text-muted-foreground/50" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-xl font-bold tracking-tight mb-1.5">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm max-w-md mb-6">{description}</p>
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
