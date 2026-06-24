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
  sparkline?: number[];
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

function KpiCard({
  label, value, trend, trendLabel, prefix, suffix,
  sparkline, loading = false, className, onClick,
}: KpiCardProps) {
  const trendDir = trend != null ? (trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral') : null;
  const maxSpark = sparkline ? Math.max(...sparkline, 1) : 0;

  return (
    <div
      className={cn(
        'rounded-lg bg-bg-surface p-5',
        onClick && 'cursor-pointer hover:bg-bg-surface-hover transition-colors',
        loading && 'animate-pulse pointer-events-none',
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <p className="text-[var(--text-label)] font-semibold text-text-tertiary uppercase tracking-wider">{label}</p>
      <div className="mt-2 flex items-baseline gap-1">
        {prefix && <span className="text-sm font-medium text-text-secondary">{prefix}</span>}
        <span className="text-[var(--text-heading-xl)] font-semibold tracking-tight tabular-nums text-text-primary leading-none">
          {loading ? '\u2014' : value}
        </span>
        {suffix && <span className="text-sm font-medium text-text-secondary">{suffix}</span>}
      </div>

      {trendDir && (
        <div className={cn(
          'mt-2 inline-flex items-center gap-1 text-xs font-semibold',
          trendDir === 'up' && 'text-semantic-success',
          trendDir === 'down' && 'text-semantic-danger',
          trendDir === 'neutral' && 'text-text-tertiary',
        )}>
          {trendDir === 'up' && <TrendingUp className="size-3" />}
          {trendDir === 'down' && <TrendingDown className="size-3" />}
          {trendDir === 'neutral' && <Minus className="size-3" />}
          <span>{trend != null && trend > 0 ? '+' : ''}{trend}%</span>
          {trendLabel && <span className="text-text-tertiary font-medium">{trendLabel}</span>}
        </div>
      )}

      {sparkline && sparkline.length > 1 && (
        <div className="mt-3 flex items-end gap-px" style={{ height: '32px' }}>
          {sparkline.map((val, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-action-primary/15"
              style={{
                height: `${Math.max((val / maxSpark) * 100, 4)}%`,
                opacity: 0.3 + (i / sparkline.length) * 0.7,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export { KpiCard };
export type { KpiCardProps };
