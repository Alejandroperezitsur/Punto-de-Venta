import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <div onClick={() => setOpen(!open)}>
        {trigger}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1 }}
            className={cn(
              'absolute z-50 mt-2 min-w-[200px] rounded-2xl border border-border bg-card shadow-lg overflow-hidden p-1.5',
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { Dropdown };
export type { DropdownItem, DropdownProps };
