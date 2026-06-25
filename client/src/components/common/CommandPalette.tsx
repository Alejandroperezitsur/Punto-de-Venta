import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, ShoppingCart, Package, Users, Wallet, BarChart3, Settings,
  LogOut, Zap, X, Command, Keyboard,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { SHORTCUTS, PAYMENT_SHORTCUTS } from '../../config/shortcuts';

interface Command {
  id: string;
  labelKey: string;
  descKey: string;
  icon: React.ElementType;
  action: () => void;
  shortcut?: string;
  keywords: string[];
}

export const CommandCenter: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const focusScan = useCallback(() => {
    const input = document.querySelector('input[data-scan-input]');
    if (input) (input as HTMLInputElement).focus();
  }, []);

  const commands = useMemo<Command[]>(() => [
    { id: 'checkout', labelKey: 'shortcuts.charge', descKey: 'payment.totalToCharge', icon: ShoppingCart, action: () => { document.dispatchEvent(new CustomEvent('trigger-checkout')); onClose(); }, shortcut: 'F2', keywords: ['cobrar', 'pago', 'pagar', 'checkout', 'total', 'charge', 'pay'] },
    { id: 'sales', labelKey: 'nav.sales', descKey: 'nav.sales', icon: ShoppingCart, action: () => { navigate('/ventas'); onClose(); }, shortcut: 'Ctrl+1', keywords: ['ventas', 'pos', 'vender', 'sales'] },
    { id: 'products-search', labelKey: 'shortcuts.search', descKey: 'products.searchPlaceholder', icon: Package, action: () => { navigate('/ventas'); onClose(); setTimeout(() => focusScan(), 100); }, shortcut: 'F3', keywords: ['producto', 'buscar', 'sku', 'scanner', 'product', 'search'] },
    { id: 'manual', labelKey: 'sales.manualProduct', descKey: 'sales.manualProduct', icon: Zap, action: () => { document.dispatchEvent(new CustomEvent('trigger-manual-product')); onClose(); }, shortcut: 'F4', keywords: ['manual', 'generico', 'manual'] },
    { id: 'discount', labelKey: 'shortcuts.discount', descKey: 'sales.discount', icon: Zap, action: () => { document.dispatchEvent(new CustomEvent('trigger-discount')); onClose(); }, shortcut: 'F5', keywords: ['descuento', 'discount', 'rebaja'] },
    { id: 'clear-cart', labelKey: 'shortcuts.clear', descKey: 'sales.clearCart', icon: X, action: () => { document.dispatchEvent(new CustomEvent('trigger-clear-cart')); onClose(); }, shortcut: 'F7', keywords: ['vaciar', 'limpiar', 'clear'] },
    { id: 'inventory', labelKey: 'nav.inventory', descKey: 'nav.inventory', icon: Package, action: () => { navigate('/productos'); onClose(); }, shortcut: 'Ctrl+2', keywords: ['inventario', 'productos', 'stock', 'inventory'] },
    { id: 'customers', labelKey: 'nav.customers', descKey: 'nav.customers', icon: Users, action: () => { navigate('/clientes'); onClose(); }, shortcut: 'Ctrl+3', keywords: ['cliente', 'clientes', 'persona', 'customer'] },
    { id: 'cash', labelKey: 'nav.cash', descKey: 'nav.cash', icon: Wallet, action: () => { navigate('/caja'); onClose(); }, shortcut: 'Ctrl+5', keywords: ['caja', 'efectivo', 'dinero', 'cash'] },
    { id: 'reports', labelKey: 'nav.reports', descKey: 'nav.reports', icon: BarChart3, action: () => { navigate('/reportes'); onClose(); }, shortcut: 'Ctrl+4', keywords: ['reporte', 'graficos', 'reports'] },
    { id: 'settings', labelKey: 'nav.settings', descKey: 'nav.settings', icon: Settings, action: () => { navigate('/config'); onClose(); }, shortcut: 'F10', keywords: ['configuracion', 'ajustes', 'settings'] },
    { id: 'shortcuts', labelKey: 'shortcuts.help', descKey: 'shortcuts.help', icon: Keyboard, action: () => { onClose(); setTimeout(() => document.dispatchEvent(new CustomEvent('show-shortcuts')), 100); }, shortcut: 'F1', keywords: ['ayuda', 'help', 'atajos', 'shortcuts'] },
    { id: 'logout', labelKey: 'header.logout', descKey: 'header.logout', icon: LogOut, action: () => { onClose(); setTimeout(() => document.dispatchEvent(new CustomEvent('trigger-logout')), 100); }, shortcut: 'Ctrl+Q', keywords: ['salir', 'cerrar', 'logout', 'exit'] },
  ], [navigate, onClose, focusScan, t]);

  const filtered = useMemo(() =>
    query.trim() === ''
      ? commands
      : commands.filter(cmd => {
          const q = query.toLowerCase();
          const label = t(cmd.labelKey).toLowerCase();
          const desc = t(cmd.descKey).toLowerCase();
          return label.includes(q) || desc.includes(q) ||
            cmd.keywords.some(k => k.toLowerCase().includes(q));
        }),
    [commands, query, t],
  );

  useEffect(() => {
    if (open) { setQuery(''); setSelectedIndex(0); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && filtered[selectedIndex]) { e.preventDefault(); filtered[selectedIndex].action(); }
    else if (e.key === 'Escape') { onClose(); }
  }, [filtered, selectedIndex, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center pt-[12vh]" role="dialog" aria-modal="true" aria-label={t('commandPalette.title')}>
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-bg-surface rounded-xl shadow-dialog border border-border-subtle overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle">
          <Search className="size-5 text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            placeholder={t('commandPalette.placeholder')}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            className="flex-1 text-base outline-none bg-transparent placeholder:text-text-tertiary text-text-primary font-medium"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium text-text-tertiary bg-bg-inset rounded-md border border-border-subtle">
            <Command className="size-3" />K
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="py-10 text-center">
              <Search className="size-10 mx-auto mb-3 text-text-disabled" />
              <p className="text-sm text-text-tertiary font-medium">{t('commandPalette.noResults')} "{query}"</p>
            </div>
          )}
          {filtered.map((cmd, index) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                onClick={cmd.action}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-100',
                  index === selectedIndex
                    ? 'bg-bg-surface-active text-text-primary'
                    : 'text-text-secondary hover:bg-bg-surface-hover',
                )}
              >
                <Icon className={cn('size-4 shrink-0', index === selectedIndex ? 'text-text-primary' : 'text-text-tertiary')} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{t(cmd.labelKey)}</div>
                  <div className="text-xs text-text-tertiary truncate">{t(cmd.descKey)}</div>
                </div>
                {cmd.shortcut && (
                  <kbd className="shrink-0 px-2 py-0.5 text-[10px] font-bold text-text-tertiary bg-bg-inset rounded-md border border-border-subtle">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-5 py-2.5 border-t border-border-subtle flex items-center gap-5 text-[10px] text-text-tertiary font-medium">
          <span><kbd className="px-1 py-0.5 rounded bg-bg-inset mr-1">↑↓</kbd> {t('commandPalette.navigate')}</span>
          <span><kbd className="px-1 py-0.5 rounded bg-bg-inset mr-1">↵</kbd> {t('commandPalette.select')}</span>
          <span><kbd className="px-1 py-0.5 rounded bg-bg-inset mr-1">Esc</kbd> {t('commandPalette.close')}</span>
        </div>
      </div>
    </div>
  );
};

export function useKeyboardShortcuts(onAction: (action: string) => void): void {
  const onActionRef = useRef(onAction);
  useEffect(() => { onActionRef.current = onAction; }, [onAction]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.key === 'F2') { e.preventDefault(); onActionRef.current('checkout'); }
      if (e.key === 'F3' && !isInput) { e.preventDefault(); onActionRef.current('focus-search'); }
      if (e.key === 'F4' && !isInput) { e.preventDefault(); onActionRef.current('manual-product'); }
      if (e.key === 'F5' && !isInput) { e.preventDefault(); onActionRef.current('discount'); }
      if (e.key === 'F6' && !isInput) { e.preventDefault(); onActionRef.current('customer'); }
      if (e.key === 'F7') { e.preventDefault(); onActionRef.current('clear-cart'); }
      if (e.key === 'F8' && !isInput) { e.preventDefault(); onActionRef.current('hold-ticket'); }
      if (e.key === 'F1' && !isInput) { e.preventDefault(); onActionRef.current('show-shortcuts'); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); onActionRef.current('command-palette'); }
      if (e.key === 'Escape') { onActionRef.current('escape'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}

export const ShortcutsOverlay: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { t } = useTranslation();
  if (!open) return null;

  const allShortcuts = [
    ...SHORTCUTS.map(s => ({ key: s.key, label: t(`shortcuts.${s.labelKey}`) || s.label })),
    ...PAYMENT_SHORTCUTS.map(s => ({ key: s.key, label: (t(`shortcuts.${s.labelKey}`) || s.label) + (t('payment.cash') === 'Efectivo' ? ' (en cobro)' : ' (at checkout)') })),
  ];

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-bg-surface rounded-xl border border-border-subtle shadow-dialog p-6 w-full max-w-md animate-scale-in"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label={t('shortcuts.help')}
      >
        <h2 className="text-lg font-bold mb-4 text-text-primary">{t('shortcuts.help')}</h2>
        <div className="space-y-0.5">
          {allShortcuts.map(s => (
            <div key={s.key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-bg-surface-hover transition-colors">
              <span className="text-sm text-text-primary">{s.label}</span>
              <kbd className="px-3 py-1 text-xs font-bold bg-bg-inset text-text-secondary rounded-md border border-border-subtle">{s.key}</kbd>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-5 py-2.5 rounded-md bg-action-primary text-[var(--action-primary-text)] font-semibold text-sm hover:bg-action-primary-hover transition-colors"
        >
          {t('common.close')}
        </button>
      </div>
    </div>
  );
};

export { CommandCenter as CommandPalette };
