import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: { value: string; label: string }[];
  placeholder?: string;
  onChange?: (value: string) => void;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, onChange, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'w-full h-[var(--control-lg)] rounded-md border border-border-default bg-bg-surface px-3 pr-8 text-sm',
          'text-text-primary appearance-none cursor-pointer',
          'transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-focus-ring/20 focus:border-focus-ring/40',
          'hover:border-border-strong',
          className,
        )}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-text-tertiary pointer-events-none" />
    </div>
  ),
);
Select.displayName = 'Select';

export { Select };
