import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: string;
  success?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, error, success, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    return (
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          type={inputType}
          className={cn(
            'w-full h-[var(--control-lg)] rounded-md border bg-bg-surface px-3 text-sm',
            'text-text-primary placeholder:text-text-tertiary',
            'transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-focus-ring/20 focus:border-focus-ring/40',
            icon && 'pl-9',
            isPassword && 'pr-10',
            error
              ? 'border-danger/40 focus:border-danger focus:ring-danger/20'
              : success
                ? 'border-success/40 focus:border-success focus:ring-success/20'
                : 'border-border-default hover:border-border-strong',
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-text-tertiary hover:text-text-primary transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
        {error && <p className="mt-1 text-xs text-danger font-medium">{error}</p>}
        {success && <p className="mt-1 text-xs text-success font-medium">{success}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };
