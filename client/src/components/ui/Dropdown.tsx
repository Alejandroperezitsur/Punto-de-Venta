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
  const [shouldRender, setShouldRender] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
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
      setShouldRender(true);
      requestAnimationFrame(() => setIsOpen(true));
    } else {
      setIsOpen(false);
      const timer = setTimeout(() => setShouldRender(false), 80);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <div onClick={() => setOpen(!open)}>
        {trigger}
      </div>
      {shouldRender && (
        <div
          className={cn(
            'absolute z-[var(--z-dropdown)] mt-1 min-w-[200px] rounded-lg border border-border bg-card shadow-md overflow-hidden p-1',
            'transition-all duration-80',
            isOpen
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-[-2px] pointer-events-none',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, i) => {
            if (item.divider) {
              return <div key={`div-${i}`} className="h-px bg-border my-1 mx-2" />;
            }
            const Icon = item.icon;
            return (
              <button
                key={i}
                onClick={() => { if (!item.disabled) { item.onClick(); setOpen(false); } }}
                disabled={item.disabled}
                className={cn(
                  'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors',
                  item.danger
                    ? 'text-danger hover:bg-danger/10'
                    : 'text-foreground hover:bg-muted',
                  item.disabled && 'opacity-50 cursor-not-allowed',
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
