import React from 'react';
import { cn } from '../../utils/cn';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  prefix?: string;
  suffix?: string;
  icon?: React.ElementType;
  iconColor?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
  sparkline?: number[];
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

const iconColors = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
  muted: 'bg-muted text-muted-foreground',
};

function KpiCard({
  label,
  value,
  trend,
  trendLabel,
  prefix,
  suffix,
  icon: Icon,
  iconColor = 'primary',
  sparkline,
  loading = false,
  className,
  onClick,
}: KpiCardProps) {
  const Component = onClick ? 'button' : 'div';
  const trendDir = trend != null ? (trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral') : null;

  const maxSpark = sparkline ? Math.max(...sparkline, 1) : 0;

  return (
    <Component
      className={cn(
        'relative rounded-xl border border-border/40 bg-card p-4 transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5 hover:border-border-accent/40',
        'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5',
        'after:bg-gradient-to-r after:from-primary after:to-primary/40 after:opacity-0 hover:after:opacity-100 after:transition-opacity',
        onClick && 'cursor-pointer active:scale-[0.995]',
        loading && 'animate-pulse pointer-events-none',
        className,
      )}
      onClick={onClick}
      {...(onClick ? { type: 'button' as const } : {})}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className="mt-1.5 flex items-baseline gap-1">
            {prefix && <span className="text-sm font-medium text-muted-foreground">{prefix}</span>}
            <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {loading ? '\u2014' : value}
            </span>
            {suffix && <span className="text-sm font-medium text-muted-foreground">{suffix}</span>}
          </div>
          {trendDir && (
            <div className={cn(
              'mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold',
              trendDir === 'up' && 'text-success',
              trendDir === 'down' && 'text-danger',
              trendDir === 'neutral' && 'text-muted-foreground',
            )}>
              {trendDir === 'up' && <TrendingUp className="size-3" />}
              {trendDir === 'down' && <TrendingDown className="size-3" />}
              {trendDir === 'neutral' && <Minus className="size-3" />}
              <span>{trend != null && trend > 0 ? '+' : ''}{trend}%</span>
              {trendLabel && <span className="text-muted-foreground font-medium">{trendLabel}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('size-10 rounded-lg flex items-center justify-center shrink-0', iconColors[iconColor])}>
            <Icon className="size-5" />
          </div>
        )}
      </div>
      {sparkline && sparkline.length > 1 && (
        <div className="mt-3 flex items-end gap-px" style={{ height: 'var(--sparkline-height, 32px)' }}>
          {sparkline.map((val, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-primary/20 transition-all duration-300"
              style={{
                height: `${Math.max((val / maxSpark) * 100, 4)}%`,
                opacity: 0.4 + (i / sparkline.length) * 0.6,
              }}
            />
          ))}
        </div>
      )}
    </Component>
  );
}

export { KpiCard };
export type { KpiCardProps };
