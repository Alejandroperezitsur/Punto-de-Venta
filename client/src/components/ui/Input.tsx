import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  error?: string;
  success?: boolean;
  label?: string;
  showPasswordToggle?: boolean;
}

const sizeStyles = {
  sm: 'h-[var(--control-sm)] text-sm px-3',
  md: 'h-[var(--control-md)] text-sm px-3.5',
  lg: 'h-12 text-[var(--text-body)] px-4',
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size = 'md', icon, error, success, label, showPasswordToggle, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const resolvedType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="relative w-full">
        {label && (
          <label className="block text-xs font-semibold text-text-tertiary mb-1.5 ml-0.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={resolvedType || 'text'}
            className={cn(
              'w-full rounded-sm border bg-bg-inset text-text-primary placeholder:text-text-tertiary',
              'transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-focus-ring/30 focus:border-border-strong',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              icon && 'pl-10',
              showPasswordToggle && 'pr-10',
              error ? 'border-semantic-danger/50 focus:border-semantic-danger' : 'border-border-default',
              success && 'border-semantic-success/50 focus:border-semantic-success',
              sizeStyles[size],
              className,
            )}
            {...props}
          />

          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors p-0.5"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          )}
        </div>

        {error && (
          <p className="text-xs font-medium text-semantic-danger mt-1.5 ml-0.5">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };
