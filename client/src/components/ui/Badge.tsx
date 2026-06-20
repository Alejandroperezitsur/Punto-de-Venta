import React from 'react';
import { cn } from '../../utils/cn';

const variants = {
  default: 'bg-primary/8 text-primary border-primary/15',
  success: 'bg-success/8 text-success border-success/15',
  warning: 'bg-warning/8 text-warning border-warning/15',
  danger: 'bg-danger/8 text-danger border-danger/15',
  info: 'bg-info/8 text-info border-info/15',
  neutral: 'bg-muted/60 text-muted-foreground border-border/50',
  premium: 'bg-primary/10 text-primary border-primary/20 shadow-sm shadow-primary/5',
  'outline-glow': 'bg-transparent text-primary border-primary/40 shadow-glow',
  'dot-only': 'border-0 bg-transparent p-0',
  glass: 'backdrop-blur-md bg-surface-glass/40 text-foreground border-white/10 shadow-sm',
};

const sizes = {
  xs: 'px-1 py-px text-[9px]',
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-[11px]',
  lg: 'px-2.5 py-1 text-xs',
};

interface BadgeProps {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function Badge({ variant = 'default', size = 'md', dot, pulse, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold rounded-full border transition-colors',
        'whitespace-nowrap select-none',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            'size-1.5 rounded-full shrink-0',
            pulse && 'animate-pulse',
            variant === 'default' && 'bg-primary',
            variant === 'success' && 'bg-success',
            variant === 'warning' && 'bg-warning',
            variant === 'danger' && 'bg-danger',
            variant === 'info' && 'bg-info',
            variant === 'neutral' && 'bg-muted-foreground',
          )}
        />
      )}
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps };
