import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';

interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: React.ElementType;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'start' | 'end';
  className?: string;
}

function Dropdown({ trigger, items, align = 'end', className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {visible && (
        <div
          className={cn(
            'absolute z-[var(--z-dropdown)] mt-1 min-w-[180px] max-w-[280px] rounded-lg bg-bg-surface shadow-dropdown border border-border-subtle overflow-hidden p-1',
            'transition-all duration-100',
            open
              ? 'opacity-100 scale-100 pointer-events-auto'
              : 'opacity-0 scale-95 pointer-events-none',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, i) => {
            if (item.divider) {
              return <div key={`div-${i}`} className="h-px bg-border-subtle my-1 mx-2" />;
            }
            const Icon = item.icon;
            return (
              <button
                key={i}
                onClick={() => { if (!item.disabled) { item.onClick(); setOpen(false); } }}
                disabled={item.disabled}
                className={cn(
                  'flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm font-medium text-left transition-colors',
                  item.danger
                    ? 'text-semantic-danger hover:bg-semantic-danger-bg'
                    : 'text-text-primary hover:bg-bg-surface-hover',
                  item.disabled && 'opacity-40 cursor-not-allowed',
                )}
              >
                {Icon && <Icon className="size-4 shrink-0" />}
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { Dropdown };
export type { DropdownItem, DropdownProps };
