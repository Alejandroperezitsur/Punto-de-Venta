import React, { useCallback } from 'react';
import { cn } from '../../utils/cn';

interface NumpadProps {
  onInput: (value: string) => void;
  onDelete: () => void;
  onSubmit?: () => void;
  disabled?: boolean;
  className?: string;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '\u232B'];

const Numpad = React.memo(function Numpad({ onInput, onDelete, onSubmit, disabled, className }: NumpadProps) {
  const handleClick = useCallback((key: string) => {
    if (disabled) return;
    if (key === '\u232B') {
      onDelete();
      try { navigator.vibrate?.(10); } catch {}
    } else {
      onInput(key);
      try { navigator.vibrate?.(8); } catch {}
    }
  }, [onInput, onDelete, disabled]);

  return (
    <div className={cn('grid grid-cols-3 gap-2', className)}>
      {KEYS.map(k => (
        <button
          key={k}
          onClick={() => handleClick(k)}
          disabled={disabled}
          className={cn(
            'rounded-md border text-lg font-semibold transition-all duration-100 flex items-center justify-center press-effect',
            'min-h-[48px]',
            k === '\u232B'
              ? 'bg-danger-bg text-danger border-danger/20 hover:bg-danger/10'
              : 'bg-bg-surface text-text-primary border-border-subtle hover:bg-bg-surface-hover active:bg-bg-surface-active',
            disabled && 'opacity-40 cursor-not-allowed',
          )}
          aria-label={k === '\u232B' ? 'Borrar' : k}
        >
          {k}
        </button>
      ))}
      {onSubmit && (
        <button
          onClick={onSubmit}
          disabled={disabled}
          className="col-span-3 rounded-md bg-action-primary text-[var(--bg-surface)] text-base font-semibold h-12 transition-all duration-150 press-effect disabled:opacity-40"
        >
          Aceptar
        </button>
      )}
    </div>
  );
});

export { Numpad };
