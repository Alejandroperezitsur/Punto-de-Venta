import React from 'react';
import { cn } from '../../utils/cn';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  status?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

function PageHeader({
  title,
  description,
  icon: Icon,
  breadcrumbs,
  actions,
  status,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-xs font-medium" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="size-3 text-muted-foreground/40" />}
              {crumb.href || crumb.onClick ? (
                <button
                  onClick={crumb.onClick}
                  className={cn(
                    'text-muted-foreground hover:text-foreground transition-colors',
                    i === breadcrumbs.length - 1 && 'text-foreground font-semibold pointer-events-none',
                  )}
                >
                  {crumb.label}
                </button>
              ) : (
                <span className={cn(
                  'text-muted-foreground',
                  i === breadcrumbs.length - 1 && 'text-foreground font-semibold',
                )}>
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="size-5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight truncate">{title}</h1>
              {status}
            </div>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

export { PageHeader };
export type { PageHeaderProps, BreadcrumbItem };
