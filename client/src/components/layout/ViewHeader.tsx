import React from 'react';
import { cn } from '../../utils/cn';

interface ViewHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function ViewHeader({ title, description, children, className }: ViewHeaderProps) {
  return (
    <div className={cn('flex flex-col md:flex-row justify-between items-start md:items-center gap-3', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="text-muted-foreground font-medium text-xs mt-0.5">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
          {children}
        </div>
      )}
    </div>
  );
}
