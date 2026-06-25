import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { useTheme } from '../context/ThemeContext';
import { Palette, Sun, Moon, Check } from 'lucide-react';
import { cn } from '../utils/cn';

export default function ThemeStudio() {
  const { theme, setTheme } = useTheme();

  const presets = [
    { name: 'Claro', value: 'light', bg: '#FAFAFA' },
    { name: 'Oscuro', value: 'dark', bg: '#09090B' },
  ];

  return (
    <div>
      <PageHeader title="Estudio de Tema" description="Personaliza la apariencia del sistema" icon={Palette} />
      <div className="flex gap-3 mb-6">
        {presets.map(p => (
          <button
            key={p.value}
            onClick={() => setTheme(p.value)}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
              theme === p.value
                ? 'border-action-primary bg-bg-surface-active'
                : 'border-border-subtle bg-bg-surface hover:border-border-default',
            )}
          >
            <div className="size-10 rounded-lg border border-border-subtle flex items-center justify-center" style={{ background: p.bg }}>
              {p.value === 'dark' ? <Moon className="size-5 text-white" /> : <Sun className="size-5 text-gray-700" />}
            </div>
            <span className="text-xs font-semibold text-text-primary">{p.name}</span>
            {theme === p.value && <Check className="size-3.5 text-accent" />}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 max-w-xs">
        {['text-primary', 'accent', 'success', 'warning', 'danger', 'bg-surface', 'bg-inset', 'border-default'].map(t => (
          <div key={t} className="flex items-center gap-2 text-xs text-text-secondary">
            <div className="size-5 rounded border border-border-subtle" style={{ background: `var(--${t})` }} />
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}
