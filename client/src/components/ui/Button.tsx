import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-sm',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border active:scale-[0.98]',
  ghost:
    'text-muted-foreground hover:text-foreground hover:bg-surface-hover active:scale-[0.98]',
  danger:
    'bg-danger text-danger-foreground hover:bg-danger/90 active:scale-[0.98] shadow-sm',
  outline:
    'border border-border text-foreground hover:bg-surface-hover active:scale-[0.98]',
  success:
    'bg-success text-success-foreground hover:bg-success/90 active:scale-[0.98] shadow-sm',
  warning:
    'bg-warning text-warning-foreground hover:bg-warning/90 active:scale-[0.98] shadow-sm',
};

const sizes = {
  xs: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  sm: 'h-9 px-3.5 text-sm rounded-xl gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-5 text-base rounded-2xl gap-2.5',
  xl: 'h-14 px-7 text-lg rounded-2xl gap-3',
  '2xl': 'h-16 px-8 text-xl rounded-3xl gap-3',
  icon: 'h-10 w-10 rounded-xl',
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
          'inline-flex items-center justify-center font-semibold transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-40 select-none',
          variants[variant],
          sizes[size],
          className,
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="size-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
