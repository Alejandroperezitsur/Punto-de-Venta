import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  variant?: 'default' | 'glass' | 'elevated' | 'interactive' | 'outline' | 'frosted' | 'inset' | 'premium' | 'accent' | 'dashboard';
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

function Card({ variant = 'default', className, children, onClick }: CardProps) {
  const Component = onClick ? 'button' : 'div';
  const variants = {
    default: 'bg-card text-card-foreground border border-border/60 shadow-xs',
    glass: 'backdrop-blur-lg bg-surface/70 text-foreground border border-border/20 shadow-sm',
    elevated: 'bg-card text-card-foreground border border-border/40 shadow-md',
    interactive:
      'bg-card text-card-foreground border border-border/50 shadow-xs hover:shadow-md hover:border-primary/25 transition-all duration-150 cursor-pointer active:scale-[0.995] hover:-translate-y-px',
    outline: 'bg-transparent text-foreground border border-border/50',
    frosted: 'backdrop-blur-xl bg-surface-glass/80 text-foreground border border-white/10 shadow-lg',
    inset: 'bg-surface-inset text-foreground border border-border-subtle shadow-inner-sm',
    premium: 'bg-card text-card-foreground shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-px gradient-border',
    accent: 'bg-surface-accent text-foreground border border-border/30 shadow-xs',
    dashboard: 'bg-card text-card-foreground border border-border/40 shadow-sm hover:shadow-md hover:border-border-accent/40 hover:-translate-y-px transition-all duration-200',
  };
  return (
    <Component
      className={cn('rounded-xl p-4 transition-colors text-left relative', variants[variant], className)}
      onClick={onClick}
      {...(onClick ? { type: 'button' as const } : {})}
    >
      {children}
    </Component>
  );
}

function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 mb-4', className)} {...props} />;
}

function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-bold tracking-tight', className)} {...props}>
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
    <div className={cn('flex items-center pt-4 mt-4 border-t border-border/40', className)} {...props}>
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
