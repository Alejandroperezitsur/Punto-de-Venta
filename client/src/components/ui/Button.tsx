import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 shadow-[0_2px_10px_-3px_hsl(var(--primary))]',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95',
  ghost:
    'text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-95',
  danger:
    'bg-danger text-danger-foreground hover:bg-danger/90 active:scale-95',
  outline:
    'border border-border/60 text-foreground hover:bg-muted/50 hover:text-foreground active:scale-95',
  success:
    'bg-success text-success-foreground hover:bg-success/90 active:scale-95',
  warning:
    'bg-warning text-warning-foreground hover:bg-warning/90 active:scale-95',
};

const sizes = {
  sm: 'h-9 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2.5',
  xl: 'h-14 px-8 text-lg rounded-2xl gap-3',
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
          'inline-flex items-center justify-center font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none',
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
