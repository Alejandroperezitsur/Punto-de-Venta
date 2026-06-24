import React from 'react';
import { cn } from '../../utils/cn';

interface NumpadProps {
  onKey: (val: string) => void;
  disabled?: boolean;
  showDecimal?: boolean;
  className?: string;
}

const KEYS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['0', '.', 'DEL'],
];

export function Numpad({ onKey, disabled = false, showDecimal = true, className }: NumpadProps) {
  const handlePress = (key: string) => {
    if (!disabled) {
      onKey(key);
      navigator.vibrate?.(10);
    }
  };

  return (
    <div className={cn('grid grid-cols-3 gap-2', className)} aria-label="Teclado numerico">
      {KEYS.map((row, ri) => (
        row.map((key) => {
          if (key === '.' && !showDecimal) return null;
          const isSpecial = key === 'DEL';
          return (
            <button
              key={key}
              type="button"
              onClick={() => handlePress(key)}
              disabled={disabled}
              className={cn(
                'min-h-[48px] rounded-md border text-lg font-semibold transition-all duration-100 flex items-center justify-center active:scale-[0.94]',
                isSpecial
                  ? 'bg-semantic-danger-bg text-semantic-danger border-semantic-danger/20'
                  : 'bg-bg-surface text-text-primary border-border-subtle hover:bg-bg-surface-hover active:bg-bg-surface-active',
                disabled && 'opacity-40 cursor-not-allowed',
                key === '0' && ri === 3 && !showDecimal && 'col-span-3',
              )}
              aria-label={isSpecial ? 'Borrar' : key}
            >
              {isSpecial ? '\u232B' : key}
            </button>
          );
        })
      ))}
    </div>
  );
}
