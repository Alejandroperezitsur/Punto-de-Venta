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
      'rounded-lg border-2 border-dashed border-border-subtle',
      className,
    )}>
      {Icon && (
        <div className="size-16 rounded-lg bg-bg-inset flex items-center justify-center mb-5">
          <Icon className="size-7 text-text-tertiary" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-[var(--text-heading-sm)] font-semibold tracking-tight mb-1.5 text-text-primary">{title}</h3>
      {description && (
        <p className="text-text-secondary text-sm max-w-sm mb-6">{description}</p>
      )}
      {action && (
        <Button variant="primary" size="md" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
