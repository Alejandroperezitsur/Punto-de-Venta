import React from 'react';
import { cn } from '../../utils/cn';

type StatusVariant = 'live' | 'idle' | 'warning' | 'error';

interface StatusIndicatorProps {
  variant: StatusVariant;
  label?: string;
  pulse?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const variantConfig = {
  live:    { dot: 'bg-semantic-success',  text: 'text-semantic-success',  bg: 'bg-semantic-success-bg',  border: 'border-semantic-success/15' },
  idle:    { dot: 'bg-text-disabled', text: 'text-text-tertiary', bg: 'bg-bg-surface-hover', border: 'border-border-subtle' },
  warning: { dot: 'bg-semantic-warning',  text: 'text-semantic-warning',  bg: 'bg-semantic-warning-bg',  border: 'border-semantic-warning/15' },
  error:   { dot: 'bg-semantic-danger',   text: 'text-semantic-danger',   bg: 'bg-semantic-danger-bg',   border: 'border-semantic-danger/15' },
};

export function StatusIndicator({ variant, label, pulse = true, size = 'md', className }: StatusIndicatorProps) {
  const cfg = variantConfig[variant];
  const dotSize = size === 'sm' ? 'size-1.5' : 'size-2';

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-medium',
      cfg.bg, cfg.border, cfg.text,
      size === 'sm' ? 'text-[var(--text-caption)]' : 'text-[var(--text-caption)]',
      className,
    )}>
      <span className="relative flex shrink-0">
        {pulse && variant === 'live' && (
          <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-40', cfg.dot)} />
        )}
        <span className={cn('relative inline-flex rounded-full', dotSize, cfg.dot)} />
      </span>
      {label && <span>{label}</span>}
    </div>
  );
}
