import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary/88 active:bg-primary/80 shadow-sm shadow-primary/12',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary/70 border border-border/60 active:bg-secondary/60',
  ghost:
    'text-muted-foreground hover:text-foreground hover:bg-surface-hover active:bg-muted',
  danger:
    'bg-danger text-danger-foreground hover:bg-danger/90 active:bg-danger/80 shadow-sm shadow-danger/10',
  outline:
    'border border-border/70 text-foreground hover:bg-surface-hover active:bg-muted',
  success:
    'bg-success text-success-foreground hover:bg-success/90 active:bg-success/80 shadow-sm shadow-success/10',
  warning:
    'bg-warning text-warning-foreground hover:bg-warning/90 active:bg-warning/80 shadow-sm shadow-warning/10',
  'primary-glow':
    'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 shadow-glow',
  gradient:
    'text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 active:shadow-sm',
  premium:
    'glass-panel text-foreground shadow-glow hover:shadow-lg active:shadow-md',
  'gradient-success':
    'text-success-foreground shadow-md shadow-success/20 hover:shadow-lg hover:shadow-success/25 active:shadow-sm',
  hero:
    'text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md',
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
          'inline-flex items-center justify-center font-semibold transition-all duration-75',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-40 select-none',
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
