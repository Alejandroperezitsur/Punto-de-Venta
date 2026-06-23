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
  live:    { dot: 'bg-success',  ring: 'ring-success/20',  text: 'text-success',  bg: 'bg-success/8',  border: 'border-success/15' },
  idle:    { dot: 'bg-muted-foreground/50', ring: 'ring-muted-foreground/15', text: 'text-muted-foreground', bg: 'bg-muted/30', border: 'border-border/20' },
  warning: { dot: 'bg-warning',  ring: 'ring-warning/20',  text: 'text-warning',  bg: 'bg-warning/8',  border: 'border-warning/15' },
  error:   { dot: 'bg-danger',   ring: 'ring-danger/20',   text: 'text-danger',   bg: 'bg-danger/8',   border: 'border-danger/15' },
};

export function StatusIndicator({ variant, label, pulse = true, size = 'md', className }: StatusIndicatorProps) {
  const cfg = variantConfig[variant];
  const dotSize = size === 'sm' ? 'size-1.5' : 'size-2';

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-semibold',
      cfg.bg, cfg.border, cfg.text,
      size === 'sm' ? 'text-xs' : 'text-xs',
      className,
    )}>
      <span className="relative flex shrink-0">
        {pulse && variant === 'live' && (
          <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-40', cfg.dot)} />
        )}
        <span className={cn('relative inline-flex rounded-full', dotSize, cfg.dot)} />
      </span>
      {label && <span className="tracking-wide">{label}</span>}
    </div>
  );
}
