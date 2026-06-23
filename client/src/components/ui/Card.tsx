import React from 'react';
import { cn } from '../../utils/cn';

const variants = {
  default: 'bg-card border border-border/25 shadow-card',
  glass: 'backdrop-blur-lg bg-surface-glass/60 border border-white/10 shadow-sm card-glass',
  elevated: 'bg-card border border-border/20 shadow-md',
  flat: 'bg-muted/20 border border-transparent',
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variants;
  hover?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hover = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl p-[var(--card-padding)] transition-all duration-200',
        variants[variant],
        hover && 'hover:shadow-card-hover hover:-translate-y-0.5 hover:border-border/40 cursor-pointer',
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
  return <h3 className={cn('text-lg font-bold text-foreground', className)} {...props} />;
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground mt-0.5', className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription };
export type { CardProps };
