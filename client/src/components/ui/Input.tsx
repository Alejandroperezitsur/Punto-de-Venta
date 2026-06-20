import React from 'react';
import { cn } from '../../utils/cn';
import { Search, Barcode, Eye, EyeOff } from 'lucide-react';

const inputSizes = {
  xs: 'h-[var(--control-xs)] px-2 text-xs rounded-md',
  sm: 'h-[var(--control-sm)] px-2.5 text-xs rounded-md',
  md: 'h-[var(--control-md)] px-3 text-sm rounded-lg',
  lg: 'h-[var(--control-lg)] px-3.5 text-sm rounded-lg',
  xl: 'h-[var(--control-xl)] px-4 text-base rounded-xl',
};

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: keyof typeof inputSizes;
  icon?: React.ElementType;
  iconRight?: React.ElementType;
  error?: string;
  success?: boolean;
  label?: string;
  floatingLabel?: boolean;
  scanner?: boolean;
  onIconClick?: () => void;
  charCount?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size = 'md', icon: Icon, iconRight: IconRight, error, success, label, floatingLabel, scanner, onIconClick, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="relative w-full">
        {label && !floatingLabel && (
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 ml-0.5">
            {label}
          </label>
        )}
        <div className="relative group">
          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors duration-100 pointer-events-none">
              <Icon className={cn('size-4', scanner && 'size-5')} />
            </div>
          )}
          {scanner && !Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors duration-100 pointer-events-none">
              <Barcode className="size-5" />
            </div>
          )}
          <input
            ref={ref}
            type={inputType}
            className={cn(
              'flex w-full border border-input bg-card font-medium text-foreground',
              'placeholder:text-muted-foreground/40 transition-all duration-150',
              'focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/10 focus-visible:shadow-sm focus-visible:shadow-primary/6',
              'disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-muted/20',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              inputSizes[size],
              Icon && 'pl-9',
              scanner && 'pl-9 h-[var(--control-xl)] text-base font-semibold',
              IconRight && 'pr-9',
              type === 'password' && 'pr-9',
              error && 'border-danger/60 focus-visible:border-danger focus-visible:ring-danger/15',
              success && !error && 'border-success/50 focus-visible:border-success focus-visible:ring-success/15',
              scanner && 'border-primary/25 focus-visible:border-primary/50 focus-visible:ring-primary/15',
              !scanner && !error && !success && 'hover:border-foreground/15',
              className,
            )}
            {...props}
          />
          {type === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          )}
          {IconRight && (
            <button
              type="button"
              onClick={onIconClick}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              tabIndex={-1}
            >
              <IconRight className="size-4" />
            </button>
          )}
        </div>
        {floatingLabel && label && (
          <label className="absolute -top-2 left-2.5 px-1 text-[11px] font-semibold text-muted-foreground bg-card rounded">
            {label}
          </label>
        )}
        {error && (
          <p className="mt-1.5 text-[11px] font-medium text-danger ml-0.5 flex items-center gap-1">
            <span className="size-1 rounded-full bg-danger shrink-0" />
            {error}
          </p>
        )}
        {charCount && props.maxLength && (
          <p className="mt-1 text-[10px] text-muted-foreground/40 text-right tabular-nums font-medium">
            {(props.value as string)?.length ?? 0}/{props.maxLength}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };
