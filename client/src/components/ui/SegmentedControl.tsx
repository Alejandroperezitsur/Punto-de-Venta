import React from 'react';
import { cn } from '../../utils/cn';

interface Segment {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
}

interface SegmentedControlProps {
  segments: Segment[];
  value: string;
  onChange: (key: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentedControl({ segments, value, onChange, size = 'sm', className }: SegmentedControlProps) {
  return (
    <div className={cn('flex items-center rounded-lg border border-border/18 bg-muted/10 p-0.5 overflow-hidden shrink-0', className)}>
      {segments.map(({ key, label, icon: Icon, count }) => {
        const isActive = value === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={cn(
              'flex items-center gap-1.5 font-bold transition-all duration-150 whitespace-nowrap rounded-md',
              size === 'sm' ? 'px-2.5 h-[var(--control-sm)] text-[10px]' : 'px-3 h-[var(--control-md)] text-xs',
              isActive
                ? 'bg-card text-foreground shadow-sm border border-border/20'
                : 'text-muted-foreground/50 hover:text-foreground hover:bg-muted/20 border border-transparent',
            )}
            aria-pressed={isActive}
          >
            {Icon && <Icon className={cn('size-3 shrink-0', isActive ? 'text-primary' : '')} />}
            <span>{label}</span>
            {count !== undefined && (
              <span className={cn(
                'text-[10px] tabular-nums font-bold px-1 py-0.5 rounded-md min-w-[1.125rem] text-center',
                isActive ? 'bg-primary/10 text-primary' : 'bg-muted/40 text-muted-foreground/50',
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
