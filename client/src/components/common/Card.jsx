import React from 'react';
import { cn } from '../../utils/cn';

export const Card = ({ className, children, ...props }) => {
    return (
        <div
            className={cn(
                "rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-sm",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};
