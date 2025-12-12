import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

export const Button = React.forwardRef(({
    className,
    variant = 'primary',
    size = 'default',
    isLoading,
    children,
    disabled,
    type = 'button',
    ...props
}, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

    const variants = {
        primary: "bg-[var(--primary)] text-white hover:opacity-90 shadow-sm",
        secondary: "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--bg-muted)]",
        ghost: "hover:bg-[var(--bg-muted)] text-[var(--foreground)]",
        danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
    };

    const sizes = {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4 py-2 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
    };

    return (
        <button
            ref={ref}
            type={type}
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {children}
        </button>
    );
});

Button.displayName = "Button";
