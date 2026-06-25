import React from 'react';
import { cn } from '../../utils/cn';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: { value: number; positive: boolean };
  subtitle?: string;
  className?: string;
}

const KpiCard = React.memo(function KpiCard({ label, value, trend, subtitle, className }: KpiCardProps) {
  return (
    <div className={cn('rounded-lg bg-bg-surface border border-border-subtle p-5', className)}>
      <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-baseline gap-3">
        <span className="text-[var(--text-display)] font-bold tracking-tight tabular-nums text-text-primary leading-none">
          {value}
        </span>
        {trend && (
          <span className={cn(
            'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md',
            trend.positive ? 'bg-success-bg text-success-text' : 'bg-danger-bg text-danger-text',
          )}>
            {trend.positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {trend.value}%
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-text-tertiary mt-2">{subtitle}</p>}
    </div>
  );
});

export { KpiCard };
