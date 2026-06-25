import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="size-12 rounded-xl bg-bg-inset shimmer mb-4 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto mb-2" />
        <Skeleton className="h-3 w-24 mx-auto" />
      </div>
    </div>
  );
}
