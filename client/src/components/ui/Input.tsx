import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { Eye, EyeOff, Scan } from 'lucide-react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
  error?: string;
  success?: boolean;
  label?: string;
  floating?: boolean;
  scannerMode?: boolean;
  showPasswordToggle?: boolean;
  onScan?: (value: string) => void;
}

const sizeStyles = {
  sm: 'h-[var(--control-sm)] text-sm px-3',
  md: 'h-[var(--control-md)] text-sm px-3.5',
  lg: 'h-[var(--control-lg)] text-base px-4',
  xl: 'h-[var(--control-xl)] text-base px-4',
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size = 'md', icon, error, success, label, floating, scannerMode, showPasswordToggle, onScan, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = props.value !== undefined && props.value !== '';
    const resolvedType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="relative w-full">
        {(label && !floating) && (
          <label className="block text-sm font-semibold text-muted-foreground mb-1.5 ml-0.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none z-10">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={resolvedType || 'text'}
            onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
            onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
            className={cn(
              'w-full rounded-xl border bg-card text-foreground placeholder:text-muted-foreground/35',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring/40 focus:shadow-[0_0_0_4px_hsl(var(--ring)/0.06)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              icon && 'pl-10',
              scannerMode && 'pr-10',
              showPasswordToggle && 'pr-10',
              error ? 'border-danger/40 focus:border-danger/50 focus:ring-danger/20' : 'border-border/30 hover:border-border/50',
              success && 'border-success/40 focus:border-success/50 focus:ring-success/20',
              floating && 'pt-5 pb-2',
              sizeStyles[size],
              className,
            )}
            {...props}
          />

          {/* Floating label */}
          {floating && label && (
            <label
              className={cn(
                'absolute left-3.5 transition-all duration-200 pointer-events-none z-10',
                'text-muted-foreground/60 font-medium',
                (isFocused || hasValue)
                  ? 'text-xs -translate-y-2.5 top-2 text-foreground/70'
                  : 'text-sm top-1/2 -translate-y-1/2',
              )}
            >
              {label}
            </label>
          )}

          {/* Scanner mode indicator */}
          {scannerMode && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/50 pointer-events-none">
              <Scan className="size-4" />
            </div>
          )}

          {/* Password toggle */}
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors p-0.5"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs font-medium text-danger/80 mt-1.5 ml-0.5">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };
