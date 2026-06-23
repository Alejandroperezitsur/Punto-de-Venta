import React from 'react';
import { cn } from '../../utils/cn';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Trend = 'up' | 'down' | 'flat';

interface DataCardProps {
  label: string;
  value: string | number;
  trend?: Trend;
  trendValue?: string;
  icon?: React.ReactNode;
  accentColor?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

const trendConfig = {
  up:   { icon: TrendingUp,  color: 'text-success', bg: 'bg-success/10' },
  down: { icon: TrendingDown, color: 'text-danger',  bg: 'bg-danger/10' },
  flat: { icon: Minus,        color: 'text-muted-foreground', bg: 'bg-muted/40' },
};

const accentColors = {
  primary: 'from-primary/60',
  success: 'from-success/60',
  warning: 'from-warning/60',
  danger:  'from-danger/60',
  info:    'from-info/60',
  accent:  'from-accent/60',
};

export function DataCard({ label, value, trend = 'flat', trendValue, icon, accentColor = 'primary', className, children, onClick }: DataCardProps) {
  const TrendIcon = trendConfig[trend].icon;
  const trendClasses = trendConfig[trend];

  return (
    <div
      onClick={onClick}
      className={cn(
        'metric-card group',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {accentColor !== 'primary' && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5 rounded-full opacity-60"
          style={{ background: `linear-gradient(90deg, hsl(var(--${accentColor})) 0%, transparent 100%)` }}
        />
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 truncate">{label}</p>
          <p className="text-2xl font-black tracking-tighter tabular-nums text-foreground leading-none">{value}</p>
        </div>
        {icon && (
          <div className="shrink-0 size-10 rounded-xl bg-primary/8 flex items-center justify-center text-primary group-hover:bg-primary/12 transition-colors">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 mt-1">
        {trendValue && (
          <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold', trendClasses.bg, trendClasses.color)}>
            <TrendIcon className="size-3" />
            <span>{trendValue}</span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
