import React from 'react';
import { cn } from '../../utils/cn';

const variants = {
  text: 'h-3 rounded w-3/4',
  card: 'h-32 rounded-lg w-full',
  'table-row': 'h-[var(--table-row-height)] rounded w-full',
  chart: 'h-48 rounded-lg w-full',
};

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variants;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'text', ...props }, ref) => (
    <div
      ref={ref}
      className={cn('bg-bg-inset shimmer', variants[variant], className)}
      {...props}
    />
  ),
);
Skeleton.displayName = 'Skeleton';

export { Skeleton };
