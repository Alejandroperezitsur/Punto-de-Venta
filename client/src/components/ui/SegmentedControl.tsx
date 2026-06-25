import React from 'react';
import { cn } from '../../utils/cn';

interface Segment {
  key: string;
  label: string;
  icon?: React.ElementType;
}

interface SegmentedControlProps {
  segments: Segment[];
  value: string;
  onChange: (key: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

const SegmentedControl = React.memo(function SegmentedControl({
  segments, value, onChange, size = 'md', className,
}: SegmentedControlProps) {
  return (
    <div className={cn(
      'inline-flex rounded-lg bg-bg-inset p-0.5',
      size === 'sm' ? 'h-8' : 'h-9',
      className,
    )}>
      {segments.map(s => {
        const active = value === s.key;
        const Icon = s.icon;
        return (
          <button
            key={s.key}
            onClick={() => onChange(s.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-md font-medium transition-all duration-150',
              size === 'sm' ? 'px-2.5 text-xs' : 'px-3 text-sm',
              active
                ? 'bg-bg-surface text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary',
            )}
          >
            {Icon && <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} />}
            {s.label}
          </button>
        );
      })}
    </div>
  );
});

export { SegmentedControl };
