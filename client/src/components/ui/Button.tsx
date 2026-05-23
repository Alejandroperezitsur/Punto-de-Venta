import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-primary text-primary-foreground hover:brightness-110 shadow-glow active:scale-[0.97]',
  secondary:
    'bg-secondary text-secondary-foreground border border-border hover:bg-surface-hover active:scale-[0.97]',
  ghost:
    'text-muted-foreground hover:text-foreground hover:bg-surface-hover active:scale-[0.97]',
  danger:
    'bg-danger text-danger-foreground hover:brightness-110 shadow-lg active:scale-[0.97]',
  outline:
    'border-2 border-primary text-primary hover:bg-primary/5 active:scale-[0.97]',
  success:
    'bg-success text-success-foreground hover:brightness-110 shadow-lg active:scale-[0.97]',
  warning:
    'bg-warning text-warning-foreground hover:brightness-110 shadow-lg active:scale-[0.97]',
};

const sizes = {
  sm: 'h-9 px-3 text-xs rounded-xl gap-1.5',
  md: 'h-11 px-5 text-sm rounded-xl gap-2',
  lg: 'h-13 px-7 text-base rounded-2xl gap-2.5',
  xl: 'h-16 px-10 text-lg rounded-2xl gap-3',
  icon: 'h-11 w-11 rounded-xl',
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
