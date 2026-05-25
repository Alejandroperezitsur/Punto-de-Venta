import React from 'react';
import { cn } from '../../utils/cn';

const variants = {
  default: 'bg-card text-card-foreground border border-border shadow-sm',
  glass: 'glass text-foreground',
  elevated: 'bg-card text-card-foreground border border-border shadow-xl',
  interactive: 'bg-card text-card-foreground border border-border shadow-sm hover:shadow-lg hover:-translate-y-0.5 cursor-pointer',
  outline: 'bg-transparent text-foreground border-2 border-border',
};

interface CardProps {
  variant?: keyof typeof variants;
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

function Card({ variant = 'default', className, children, onClick }: CardProps) {
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      className={cn(
        'rounded-3xl p-6 transition-all duration-200 text-left',
        variants[variant],
        className,
      )}
      onClick={onClick}
      {...(onClick ? { type: 'button' as const } : {})}
    >
      {children}
    </Component>
  );
}

function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-1.5 mb-4', className)} {...props}>
      {children}
    </div>
  );
}

function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-xl font-bold tracking-tight', className)} {...props}>
      {children}
    </h3>
  );
}

function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props}>
      {children}
    </p>
  );
}

function CardBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center pt-4 mt-4 border-t border-border', className)} {...props}>
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Body = CardBody;
Card.Footer = CardFooter;

export { Card };
export type { CardProps };
