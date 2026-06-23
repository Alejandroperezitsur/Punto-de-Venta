import React from 'react';
import { cn } from '../../utils/cn';

const variants = {
  primary:
    'bg-primary text-primary-foreground hover:brightness-110 active:brightness-90 shadow-sm shadow-primary/15 hover:shadow-md hover:shadow-primary/20 hover:-translate-y-px relative overflow-hidden',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/40 active:bg-secondary/70',
  ghost:
    'text-muted-foreground hover:text-foreground hover:bg-surface-hover/60 active:bg-muted/50',
  danger:
    'bg-danger text-danger-foreground hover:brightness-110 active:brightness-90 shadow-sm shadow-danger/12',
  outline:
    'border border-border/40 text-foreground hover:bg-surface-hover/50 hover:border-border/60 active:bg-muted/40',
  success:
    'bg-success text-success-foreground hover:brightness-110 active:brightness-90 shadow-sm shadow-success/12',
  warning:
    'bg-warning text-warning-foreground hover:brightness-110 active:brightness-90 shadow-sm shadow-warning/12',
  'primary-glow':
    'bg-primary text-primary-foreground hover:brightness-110 active:brightness-90 shadow-glow',
  gradient:
    'text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-px active:translate-y-0 active:shadow-sm',
  'gradient-success':
    'text-success-foreground shadow-md shadow-success/20 hover:shadow-lg hover:shadow-success/25 hover:-translate-y-px active:translate-y-0 active:shadow-sm',
  'premium':
    'glass-panel text-foreground shadow-glow hover:shadow-lg active:shadow-md',
  'glass':
    'backdrop-blur-lg bg-surface-glass/60 text-foreground border border-white/10 hover:bg-surface-glass/70 hover:border-white/15 active:bg-surface-glass/50 shadow-sm hover:shadow-md btn-glass',
  'hero':
    'text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md',
  'dense':
    'bg-card border border-border/25 text-foreground hover:bg-muted/30 hover:border-border/40 active:bg-muted/50 shadow-xs',
};

const sizes = {
  xs: 'h-[var(--control-xs)] px-2.5 text-xs rounded-xl gap-1',
  sm: 'h-[var(--control-sm)] px-3 text-xs rounded-xl gap-1',
  md: 'h-[var(--control-md)] px-4 text-sm rounded-xl gap-1.5',
  lg: 'h-[var(--control-lg)] px-5 text-sm rounded-xl gap-2',
  xl: 'h-[var(--control-xl)] px-6 text-base rounded-xl gap-2',
  '2xl': 'h-[var(--control-2xl)] px-7 text-lg rounded-2xl gap-2.5',
  icon: 'h-[var(--control-md)] w-[var(--control-md)] rounded-xl',
  'icon-sm': 'h-[var(--control-sm)] w-[var(--control-sm)] rounded-xl',
  'icon-circle': 'size-9 rounded-full',
  'icon-circle-sm': 'size-7 rounded-full',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  isLoading?: boolean;
  children?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, type = 'button', style, ...props }, ref) => {
    const gradientStyle =
      variant === 'gradient' ? { background: 'var(--gradient-primary)' } :
      variant === 'gradient-success' ? { background: 'var(--gradient-success)' } :
      variant === 'hero' ? { background: 'var(--gradient-primary)' } :
      undefined;

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card',
          'disabled:pointer-events-none disabled:opacity-50 select-none',
          'active:scale-[0.97]',
          'touch-target',
          variants[variant],
          sizes[size],
          className,
        )}
        disabled={disabled || isLoading}
        style={{ ...gradientStyle, ...style }}
        {...props}
      >
        {isLoading && (
          <span className="size-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin shrink-0" />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
