import React from 'react';
import { cn } from '../../utils/cn';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  className?: string;
}

const PageHeader = React.memo(function PageHeader({ title, description, icon: Icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between mb-6', className)}>
      <div className="flex items-start gap-4 min-w-0">
        {Icon && (
          <div className="size-10 rounded-lg bg-bg-inset flex items-center justify-center shrink-0">
            <Icon className="size-5 text-text-secondary" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-[var(--text-heading-lg)] font-semibold text-text-primary tracking-tight">{title}</h1>
          {description && <p className="text-sm text-text-secondary mt-1">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
});

export { PageHeader };
