import React from 'react';
import { cn } from '../../utils/cn';

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'syncing' | 'error';
  label?: string;
  size?: 'sm' | 'md';
}

const StatusIndicator = React.memo(function StatusIndicator({ status, label, size = 'sm' }: StatusIndicatorProps) {
  const colorMap = {
    online: 'bg-success',
    offline: 'bg-warning',
    syncing: 'bg-info animate-pulse',
    error: 'bg-danger',
  };

  return (
    <div className="inline-flex items-center gap-2">
      <span className={cn(
        'rounded-full block',
        size === 'sm' ? 'size-1.5' : 'size-2.5',
        colorMap[status],
        status === 'online' && 'animate-pulse',
      )} />
      {label && <span className="text-xs text-text-secondary font-medium">{label}</span>}
    </div>
  );
});

export { StatusIndicator };
