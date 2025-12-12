import React from 'react';
import { cn } from '../../utils/cn';

export const Input = React.forwardRef(({ className, icon: Icon, error, ...props }, ref) => {
    return (
        <div className="relative w-full">
            {Icon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <Icon className="h-4 w-4" />
                </div>
            )}
            <input
                className={cn(
                    "flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm ring-offset-[var(--bg)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50 transition-shadow",
                    Icon && "pl-10",
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
