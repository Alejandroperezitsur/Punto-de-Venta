import React from 'react';
import { Store, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';

export function Splash() {
  return (
    <div className="fixed inset-0 bg-bg-app flex items-center justify-center z-[var(--z-max)]">
      <div className="text-center">
        <div className="size-16 rounded-xl bg-action-primary flex items-center justify-center mx-auto mb-4">
          <Store className="size-8 text-[var(--bg-surface)]" />
        </div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">POS Pro</h1>
        <p className="text-sm text-text-tertiary mt-2">Cargando...</p>
        <div className="mt-4 w-32 h-1 rounded-full bg-bg-inset mx-auto overflow-hidden">
          <div className="h-full rounded-full bg-action-primary animate-pulse w-2/3" />
        </div>
        <p className="text-[9px] text-text-tertiary/30 mt-4 select-none">APV Labs</p>
      </div>
    </div>
  );
}
