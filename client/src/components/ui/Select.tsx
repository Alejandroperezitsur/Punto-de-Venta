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
  label?: string;
}

const sizeStyles = {
  sm: 'h-[var(--control-sm)] text-xs pl-2.5 pr-8',
  md: 'h-[var(--control-md)] text-sm pl-3 pr-9',
  lg: 'h-[var(--control-lg)] text-sm pl-3.5 pr-10',
};

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, size = 'md', error, label, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {label && (
          <label className="block text-xs font-semibold text-text-tertiary mb-1.5 ml-0.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full appearance-none rounded-sm border bg-bg-inset text-text-primary',
              'transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-focus-ring/30 focus:border-border-strong',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              error ? 'border-semantic-danger/50 focus:border-semantic-danger' : 'border-border-default',
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
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
            <ChevronDown className="size-3.5" />
          </div>
        </div>
        {error && (
          <p className="text-xs font-medium text-semantic-danger mt-1 ml-0.5">{error}</p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';

export { Select };
export type { SelectOption, SelectProps };
