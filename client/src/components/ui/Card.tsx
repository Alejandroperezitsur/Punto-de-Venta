import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg bg-bg-surface p-[var(--padding-card)]',
        'transition-colors duration-150',
        hover && 'cursor-pointer hover:bg-bg-surface-hover',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4', className)} {...props} />;
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-[var(--text-heading-sm)] font-semibold text-text-primary tracking-tight', className)} {...props} />;
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-text-secondary mt-1', className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription };
export type { CardProps };
