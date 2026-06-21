import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { Eye, EyeOff, Search, Scan } from 'lucide-react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
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
  xs: 'h-[var(--control-xs)] text-xs px-2',
  sm: 'h-[var(--control-sm)] text-xs px-2.5',
  md: 'h-[var(--control-md)] text-sm px-3',
  lg: 'h-[var(--control-lg)] text-sm px-3.5',
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
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5 ml-0.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none z-10">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={resolvedType || 'text'}
            onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
            onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
            className={cn(
              'w-full rounded-lg border bg-card text-foreground placeholder:text-muted-foreground/45',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-ring/35 focus:border-ring/50 focus:shadow-[0_0_0_3px_hsl(var(--ring)/0.08)]',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              icon && 'pl-9',
              scannerMode && 'pr-10',
              showPasswordToggle && 'pr-10',
              error ? 'border-danger/50 focus:border-danger/60 focus:ring-danger/20' : 'border-border/60 hover:border-border/80',
              success && 'border-success/50 focus:border-success/60 focus:ring-success/20',
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
                'absolute left-3 transition-all duration-200 pointer-events-none z-10',
                'text-muted-foreground/50 font-medium',
                (isFocused || hasValue)
                  ? 'text-[10px] -translate-y-2 top-1.5'
                  : 'text-sm top-1/2 -translate-y-1/2',
              )}
            >
              {label}
            </label>
          )}

          {/* Scanner mode indicator */}
          {scannerMode && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/50 pointer-events-none">
              <Scan className="size-4" />
            </div>
          )}

          {/* Password toggle */}
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors p-0.5"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-[11px] font-medium text-danger/80 mt-1 ml-0.5">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };