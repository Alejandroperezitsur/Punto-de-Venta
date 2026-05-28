import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 shadow-sm',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border active:bg-secondary/70',
  ghost:
    'text-muted-foreground hover:text-foreground hover:bg-surface-hover active:bg-muted',
  danger:
    'bg-danger text-danger-foreground hover:bg-danger/90 active:bg-danger/80 shadow-sm',
  outline:
    'border border-border text-foreground hover:bg-surface-hover active:bg-muted',
  success:
    'bg-success text-success-foreground hover:bg-success/90 active:bg-success/80 shadow-sm',
  warning:
    'bg-warning text-warning-foreground hover:bg-warning/90 active:bg-warning/80 shadow-sm',
};

const sizes = {
  xs: 'h-[var(--control-sm)] px-2.5 text-xs rounded-md gap-1',
  sm: 'h-[var(--control-sm)] px-3 text-xs rounded-md gap-1',
  md: 'h-[var(--control-md)] px-3.5 text-sm rounded-md gap-1.5',
  lg: 'h-[var(--control-lg)] px-4 text-sm rounded-md gap-2',
  xl: 'h-[var(--control-xl)] px-6 text-base rounded-lg gap-2',
  '2xl': 'h-[var(--touch-target-xl)] px-6 text-lg rounded-lg gap-2',
  icon: 'h-[var(--control-md)] w-[var(--control-md)] rounded-md',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  isLoading?: boolean;
  children?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all duration-75',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          'disabled:pointer-events-none disabled:opacity-40 select-none',
          'touch-target',
          variants[variant],
          sizes[size],
          className,
        )}
        disabled={disabled || isLoading}
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
