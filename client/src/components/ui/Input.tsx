import React from 'react';
import { cn } from '../../utils/cn';
import { Search, Barcode, Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ElementType;
  iconRight?: React.ElementType;
  error?: string;
  label?: string;
  floatingLabel?: boolean;
  scanner?: boolean;
  onIconClick?: () => void;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon: Icon, iconRight: IconRight, error, label, floatingLabel, scanner, onIconClick, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputType = type === 'password' && showPassword ? 'text' : type;

    return (
      <div className="relative w-full">
        {label && !floatingLabel && (
          <label className="block text-sm font-semibold text-muted-foreground mb-1.5 ml-1">
            {label}
          </label>
        )}
        <div className="relative group">
          {Icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-ring transition-colors pointer-events-none">
              <Icon className={cn('size-5', scanner && 'size-6')} />
            </div>
          )}
          {scanner && !Icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-ring transition-colors pointer-events-none">
              <Barcode className="size-6" />
            </div>
          )}
          <input
            ref={ref}
            type={inputType}
            className={cn(
              'flex w-full rounded-2xl border-2 border-input bg-card px-4 py-3 text-base font-medium text-foreground placeholder:text-muted-foreground/60 transition-all duration-200',
              'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-0',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/30',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              Icon && 'pl-12',
              scanner && 'pl-12 h-16 text-lg font-semibold',
              IconRight && 'pr-12',
              type === 'password' && 'pr-12',
              error && 'border-danger focus-visible:border-danger focus-visible:ring-danger/20',
              scanner && 'border-dashed border-2 border-muted-foreground/20 focus-visible:border-solid',
              className,
            )}
            {...props}
          />
          {type === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          )}
          {IconRight && (
            <button
              type="button"
              onClick={onIconClick}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
              tabIndex={-1}
            >
              <IconRight className="size-5" />
            </button>
          )}
        </div>
        {floatingLabel && label && (
          <label className="absolute -top-2.5 left-3 px-1.5 text-xs font-semibold text-muted-foreground bg-card rounded-md">
            {label}
          </label>
        )}
        {error && (
          <p className="mt-1.5 text-xs font-medium text-danger ml-1 flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-danger shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };
