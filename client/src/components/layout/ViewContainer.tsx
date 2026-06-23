import React from 'react';
import { cn } from '../../utils/cn';

interface ViewContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const maxWidths = {
  sm: 'max-w-3xl',
  md: 'max-w-6xl',
  lg: 'max-w-7xl',
  xl: 'max-w-full',
  full: 'max-w-full',
};

export function ViewContainer({ children, className, maxWidth = 'full' }: ViewContainerProps) {
  return (
    <div className={cn('space-y-6 w-full mx-auto animate-fade-slide-in', maxWidths[maxWidth], className)}>
      {children}
    </div>
  );
}
