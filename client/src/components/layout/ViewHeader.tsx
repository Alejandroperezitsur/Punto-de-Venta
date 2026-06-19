import React from 'react';
import { cn } from '../../utils/cn';

interface ViewHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function ViewHeader({ title, description, children, className, icon }: ViewHeaderProps) {
  return (
    <div className={cn('flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-4 border-b border-border/10', className)}>
      <div className="min-w-0 flex items-center gap-3.5">
        {icon ? (
          <div className="size-11 rounded-xl bg-primary/8 border border-primary/10 flex items-center justify-center shrink-0">
            {icon}
          </div>
        ) : (
          <div className="w-1 h-11 rounded-full self-center shrink-0" style={{ background: 'var(--gradient-primary)' }} />
        )}
        <div>
          <h1 className="text-[1.5rem] font-bold tracking-tight text-foreground leading-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground font-medium text-xs mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
          {children}
        </div>
      )}
    </div>
  );
}
