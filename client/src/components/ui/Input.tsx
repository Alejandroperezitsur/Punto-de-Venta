import React from 'react';
import { cn } from '../../utils/cn';
import { Search, Barcode, Eye, EyeOff } from 'lucide-react';

const inputSizes = {
  xs: 'h-7 px-2 text-[11px] rounded-md',
  sm: 'h-8 px-2.5 text-xs rounded-lg',
  md: 'h-9 px-3 text-sm rounded-lg',
  lg: 'h-11 px-3.5 text-sm rounded-lg',
  xl: 'h-12 px-4 text-base rounded-xl',
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  size?: keyof typeof inputSizes;
  icon?: React.ElementType;
  iconRight?: React.ElementType;
  error?: string;
  label?: string;
  floatingLabel?: boolean;
  scanner?: boolean;
  onIconClick?: () => void;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size = 'md', icon: Icon, iconRight: IconRight, error, label, floatingLabel, scanner, onIconClick, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputType = type === 'password' && showPassword ? 'text' : type;

    return (
      <div className="relative w-full">
        {label && !floatingLabel && (
          <label className="block text-xs font-semibold text-muted-foreground mb-1 ml-1">
            {label}
          </label>
        )}
        <div className="relative group">
          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors pointer-events-none">
              <Icon className={cn('size-4', scanner && 'size-5')} />
            </div>
          )}
          {scanner && !Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors pointer-events-none">
              <Barcode className="size-5" />
            </div>
          )}
          <input
            ref={ref}
            type={inputType}
            className={cn(
              'flex w-full border border-input bg-card font-medium text-foreground',
              'placeholder:text-muted-foreground/50 transition-colors duration-75',
              'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/20',
              'disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-muted/30',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              inputSizes[size],
              Icon && 'pl-9',
              scanner && 'pl-9 h-12 text-base font-semibold',
              IconRight && 'pr-9',
              type === 'password' && 'pr-9',
              error && 'border-danger focus-visible:border-danger focus-visible:ring-danger/20',
              scanner && 'border-primary/30 focus-visible:border-primary',
              !scanner && !error && 'hover:border-foreground/20',
              className,
            )}
            {...props}
          />
          {type === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
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
          <p className="mt-1 text-[11px] font-medium text-danger ml-1 flex items-center gap-1">
            <span className="size-1 rounded-full bg-danger shrink-0" />
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
