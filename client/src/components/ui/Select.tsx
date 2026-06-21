import React from 'react';
import { cn } from '../../utils/cn';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  icon?: React.ReactNode;
  label?: string;
}

const sizeStyles = {
  sm: 'h-[var(--control-sm)] text-xs pl-2.5 pr-8',
  md: 'h-[var(--control-md)] text-sm pl-3 pr-9',
  lg: 'h-[var(--control-lg)] text-sm pl-3.5 pr-10',
};

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, size = 'md', error, icon, label, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {label && (
          <label className="block text-[11px] font-semibold text-muted-foreground/70 mb-1.5 ml-0.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none z-10">
              {icon}
            </div>
          )}
          <select
            ref={ref}
            className={cn(
              'w-full appearance-none rounded-lg border bg-card text-foreground',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/40',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              error ? 'border-danger/50 focus:border-danger/60 focus:ring-danger/20' : 'border-border/65 hover:border-border',
              icon && 'pl-9',
              sizeStyles[size],
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>{placeholder}</option>
            )}
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none">
            <ChevronDown className="size-3.5" />
          </div>
        </div>
        {error && (
          <p className="text-[11px] font-medium text-danger/80 mt-1 ml-0.5">{error}</p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';

export { Select };
export type { SelectOption, SelectProps };