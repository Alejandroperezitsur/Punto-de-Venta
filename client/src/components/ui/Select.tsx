import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SelectOption {
  value: string;
  label: string;
  icon?: React.ElementType;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  searchable?: boolean;
  error?: string;
  className?: string;
}

function Select({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  label,
  searchable = false,
  error,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value);

  const filtered = searchable
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && searchable && inputRef.current) inputRef.current.focus();
    if (!open) setQuery('');
  }, [open, searchable]);

  const handleSelect = useCallback((opt: SelectOption) => {
    onChange?.(opt.value);
    setOpen(false);
  }, [onChange]);

  const Icon = selected?.icon;

  return (
    <div ref={ref} className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-semibold text-muted-foreground mb-1.5 ml-1">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center w-full h-11 px-4 rounded-2xl border border-input bg-card text-left transition-all duration-150',
          'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20',
          open && 'border-ring ring-2 ring-ring/20',
          error && 'border-danger',
          'hover:border-foreground/20',
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {Icon && <Icon className="size-4 mr-2 text-muted-foreground shrink-0" />}
        <span className={cn('flex-1 text-sm font-medium truncate', !selected && 'text-muted-foreground/50')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -1 }}
            transition={{ duration: 0.08 }}
            className="absolute z-50 mt-1 w-full min-w-[200px] rounded-lg border border-border bg-card shadow-md overflow-hidden"
            role="listbox"
          >
            {searchable && (
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Buscar..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-xl bg-muted text-sm font-medium text-foreground placeholder:text-muted-foreground/50 border-none focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>
              </div>
            )}
            <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
              {filtered.length === 0 ? (
                <p className="px-3 py-6 text-sm text-muted-foreground text-center">Sin resultados</p>
              ) : (
                filtered.map(opt => {
                  const OptIcon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleSelect(opt)}
                      className={cn(
                        'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors',
                        opt.value === value
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-muted',
                      )}
                      role="option"
                      aria-selected={opt.value === value}
                    >
                      {OptIcon && <OptIcon className="size-4 shrink-0" />}
                      <span className="flex-1 truncate">{opt.label}</span>
                      {opt.value === value && (
                        <span className="size-2 rounded-full bg-primary shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {error && <p className="mt-1.5 text-xs font-medium text-danger ml-1">{error}</p>}
    </div>
  );
}

export { Select };
export type { SelectOption, SelectProps };
