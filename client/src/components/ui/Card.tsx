import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  variant?: 'default' | 'glass' | 'elevated' | 'interactive' | 'outline' | 'premium' | 'accent' | 'metric' | 'data-viz';
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

function Card({ variant = 'default', className, children, onClick }: CardProps) {
  const Component = onClick ? 'button' : 'div';
  const variants = {
    default: 'bg-card text-card-foreground border border-border/55 shadow-xs rounded-2xl',
    glass: 'backdrop-blur-lg bg-surface/75 text-foreground border border-border/25 shadow-sm rounded-2xl card-glass',
    elevated: 'bg-card text-card-foreground border border-border/40 shadow-md rounded-2xl',
    interactive:
      'bg-card text-card-foreground border border-border/45 shadow-xs hover:shadow-lg hover:border-primary/25 hover:-translate-y-1 transition-all duration-200 cursor-pointer active:scale-[0.995] rounded-2xl',
    outline: 'bg-transparent text-foreground border border-border/45 rounded-2xl',
    premium: 'bg-card text-card-foreground shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-px gradient-border rounded-2xl',
    accent: 'bg-surface-accent text-foreground border border-border/30 shadow-xs rounded-2xl',
    metric: 'bg-card text-card-foreground border border-border/40 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden rounded-2xl',
    'data-viz': 'bg-card text-card-foreground border border-border/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden rounded-2xl after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-gradient-to-r after:from-primary after:to-primary/40 after:opacity-0 hover:after:opacity-100 after:transition-opacity',
  };
  return (
    <Component
      className={cn('p-5 transition-all duration-200 text-left relative', variants[variant], className)}
      onClick={onClick}
      {...(onClick ? { type: 'button' as const } : {})}
    >
      {children}
    </Component>
  );
}

function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 mb-4', className)} {...props} />;
}

function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-bold tracking-tight text-foreground', className)} {...props}>
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
  return <div className={cn('', className)} {...props} />;
}

function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center pt-4 mt-4 border-t border-border/35', className)} {...props}>
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