import React from 'react';
import { cn } from '../../utils/cn';

interface ViewContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'full';
}

const maxWidths = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  full: 'max-w-full',
};

export function ViewContainer({ children, className, maxWidth = 'full' }: ViewContainerProps) {
  return (
    <div className={cn('space-y-6 w-full animate-fade-slide-in', maxWidths[maxWidth], className)}>
      {children}
    </div>
  );
}
