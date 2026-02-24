import React from 'react';
import { cn } from '../../utils/cn';

export const Input = React.forwardRef(({ className, icon: Icon, error, ...props }, ref) => {
    return (
        <div className="relative w-full group">
            {Icon && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] group-focus-within:text-[hsl(var(--primary))] transition-colors">
                    <Icon className="h-5 w-5" />
                </div>
            )}
            <input
                className={cn(
                    "flex h-14 w-full rounded-xl border-2 border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-lg font-medium ring-offset-[var(--bg)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2 focus-visible:border-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm",
                    Icon && "pl-12",
                    error && "border-red-500 focus-visible:ring-red-500",
                    className
                )}
                ref={ref}
                {...props}
            />
            {error && <span className="text-xs text-red-500 mt-1 ml-1">{error}</span>}
        </div>
    );
});

Input.displayName = "Input";
