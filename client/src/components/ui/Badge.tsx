import React from 'react';
import { cn } from '../../utils/cn';

const variants = {
  default: 'bg-primary/12 text-primary border border-primary/18',
  success: 'bg-success/10 text-success border border-success/15',
  warning: 'bg-warning/10 text-warning border border-warning/15',
  danger: 'bg-danger/10 text-danger border border-danger/15',
  info: 'bg-info/10 text-info border border-info/15',
  neutral: 'bg-muted text-muted-foreground border border-border/30',
  premium: 'bg-primary/10 text-primary border border-primary/22 shadow-sm shadow-primary/8',
  'outline-glow': 'bg-transparent text-foreground border border-ring/30 shadow-glow',
  'dot-only': 'bg-transparent text-foreground',
  glass: 'backdrop-blur-md bg-surface-glass/50 text-foreground border border-white/12 badge-glass',
};

const sizes = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2.5 py-0.5 text-[11px]',
  md: 'px-3 py-1 text-xs',
  lg: 'px-3.5 py-1 text-sm',
};

interface BadgeProps {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function Badge({ variant = 'default', size = 'sm', dot, pulse, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold rounded-full whitespace-nowrap select-none',
        'transition-all duration-200',
        variants[variant],
        sizes[size],
        className,
      )}
      style={{ lineHeight: '1.2' }}
    >
      {dot && (
        <span
          className={cn(
            'size-1.5 rounded-full shrink-0',
            pulse && 'animate-pulse',
          )}
        />
      )}
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps };