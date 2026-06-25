import React from 'react';
import { cn } from '../../utils/cn';

const variants = {
  primary:
    'bg-action-primary text-[var(--bg-surface)] hover:bg-action-primary-hover font-medium',
  secondary:
    'bg-bg-surface text-text-primary border border-border-default hover:bg-bg-surface-hover font-medium',
  ghost:
    'text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover font-medium',
  danger:
    'bg-danger-bg text-danger border border-danger/20 hover:bg-danger hover:text-white font-medium',
  accent:
    'bg-accent text-white hover:bg-accent-hover font-medium',
};

const sizes = {
  sm: 'h-[var(--control-sm)] px-3 text-xs rounded-md gap-1.5',
  md: 'h-[var(--control-md)] px-4 text-sm rounded-md gap-2',
  lg: 'h-[var(--control-lg)] px-6 text-sm rounded-md gap-2',
  xl: 'h-[var(--control-xl)] px-8 text-base rounded-lg gap-2.5',
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
          'inline-flex items-center justify-center transition-all duration-150 select-none press-effect',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/40 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-40',
          variants[variant],
          sizes[size],
          className,
        )}
        disabled={disabled || isLoading}
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
