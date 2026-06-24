import React from 'react';
import { cn } from '../../utils/cn';

const variants = {
  label: 'bg-bg-surface-hover text-text-secondary',
  status: 'gap-1.5',
  counter: 'bg-bg-inset text-text-secondary',
  alert: 'border',
};

const statusColors = {
  success: 'text-semantic-success',
  warning: 'text-semantic-warning',
  danger: 'text-semantic-danger',
  info: 'text-semantic-info',
  neutral: 'text-text-tertiary',
};

const alertColors = {
  success: 'bg-semantic-success-bg text-semantic-success border-semantic-success/20',
  warning: 'bg-semantic-warning-bg text-semantic-warning border-semantic-warning/20',
  danger: 'bg-semantic-danger-bg text-semantic-danger border-semantic-danger/20',
  info: 'bg-semantic-info-bg text-semantic-info border-semantic-info/20',
  neutral: 'bg-bg-surface-hover text-text-secondary border-border-subtle',
};

const sizes = {
  sm: 'px-2 py-0.5 text-[var(--text-caption)]',
  md: 'px-2.5 py-0.5 text-[var(--text-caption)]',
  lg: 'px-3 py-1 text-[var(--text-label)]',
};

interface BadgeProps {
  variant?: 'label' | 'status' | 'counter' | 'alert';
  color?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function Badge({ variant = 'label', color = 'neutral', size = 'sm', dot, className, children }: BadgeProps) {
  const colorClass = variant === 'alert' ? alertColors[color] : variant === 'status' ? statusColors[color] : '';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap select-none',
        variants[variant],
        colorClass,
        sizes[size],
        className,
      )}
    >
      {dot && variant === 'status' && (
        <span className={cn('size-1.5 rounded-full shrink-0', colorClass)} />
      )}
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps };
