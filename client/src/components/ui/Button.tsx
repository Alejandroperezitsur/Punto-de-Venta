import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary/88 active:bg-primary/78 shadow-sm shadow-primary/15 hover:shadow-md hover:shadow-primary/20 hover:-translate-y-px relative overflow-hidden group',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary/70 border border-border/50 active:bg-secondary/60',
  ghost:
    'text-muted-foreground hover:text-foreground hover:bg-surface-hover active:bg-muted',
  danger:
    'bg-danger text-danger-foreground hover:bg-danger/88 active:bg-danger/78 shadow-sm shadow-danger/12',
  outline:
    'border border-border/60 text-foreground hover:bg-surface-hover active:bg-muted',
  success:
    'bg-success text-success-foreground hover:bg-success/88 active:bg-success/78 shadow-sm shadow-success/12',
  warning:
    'bg-warning text-warning-foreground hover:bg-warning/88 active:bg-warning/78 shadow-sm shadow-warning/12',
  'primary-glow':
    'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/78 shadow-glow',
  gradient:
    'text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-px active:translate-y-0 active:shadow-sm',
  'gradient-success':
    'text-success-foreground shadow-md shadow-success/20 hover:shadow-lg hover:shadow-success/25 hover:-translate-y-px active:translate-y-0 active:shadow-sm',
  'premium':
    'glass-panel text-foreground shadow-glow hover:shadow-lg active:shadow-md',
  'glass':
    'backdrop-blur-md bg-surface-glass/55 text-foreground border border-white/12 hover:bg-surface-glass/65 hover:border-white/18 active:bg-surface-glass/45 shadow-sm hover:shadow-md btn-glass',
  'hero':
    'text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md',
  'dense':
    'bg-card border border-border/35 text-foreground hover:bg-muted/40 hover:border-border/50 active:bg-muted/60 shadow-xs',
};

const sizes = {
  xs: 'h-[var(--control-xs)] px-2 text-[11px] rounded-md gap-1',
  sm: 'h-[var(--control-sm)] px-3 text-xs rounded-md gap-1',
  md: 'h-[var(--control-md)] px-3.5 text-sm rounded-lg gap-1.5',
  lg: 'h-[var(--control-lg)] px-4 text-sm rounded-lg gap-2',
  xl: 'h-[var(--control-xl)] px-6 text-base rounded-xl gap-2',
  '2xl': 'h-[var(--control-2xl)] px-7 text-lg rounded-xl gap-2.5',
  icon: 'h-[var(--control-md)] w-[var(--control-md)] rounded-lg',
  'icon-sm': 'h-[var(--control-sm)] w-[var(--control-sm)] rounded-lg',
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
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card',
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
        {isLoading && <Loader2 className="size-3.5 animate-spin shrink-0" />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };