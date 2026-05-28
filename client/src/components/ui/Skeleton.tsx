import React from 'react';
import { cn } from '../../utils/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'avatar' | 'table-row' | 'chart';
}

function Skeleton({ className, variant = 'text' }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gradient-to-r from-muted/40 via-muted/60 to-muted/40 bg-[length:200%_100%]',
        variant === 'text' && 'h-4 w-full rounded-md',
        variant === 'card' && 'h-48 w-full rounded-lg',
        variant === 'avatar' && 'size-12 rounded-full',
        variant === 'table-row' && 'h-12 w-full rounded-md',
        variant === 'chart' && 'h-32 w-full rounded-lg',
        className,
      )}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="space-y-4 p-5 rounded-lg border border-border bg-card">
      <Skeleton variant="avatar" className="size-14" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 p-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-4 flex-1" />)}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-t border-border">
          {[1, 2, 3, 4].map(j => <Skeleton key={j} className="h-4 flex-1" />)}
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonTable };
export type { SkeletonProps };
