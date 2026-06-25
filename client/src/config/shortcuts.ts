/**
 * Single source of truth for all keyboard shortcuts in the POS.
 * Used by Sidebar labels, useKeyboardShortcuts, CommandPalette, and ShortcutsOverlay.
 */
export interface ShortcutDef {
  key: string;
  labelKey: string;
  action: string;
  scope: 'global' | 'sales' | 'modal';
  description: string;
}

export const SHORTCUTS: ShortcutDef[] = [
  { key: 'F1',  labelKey: 'shortcuts.help',       action: 'show-shortcuts',   scope: 'global', description: 'Show keyboard shortcuts' },
  { key: 'F2',  labelKey: 'shortcuts.charge',     action: 'checkout',         scope: 'sales',  description: 'Open checkout panel' },
  { key: 'F3',  labelKey: 'shortcuts.search',     action: 'focus-search',     scope: 'sales',  description: 'Focus search/scanner' },
  { key: 'F4',  labelKey: 'shortcuts.manual',     action: 'manual-product',   scope: 'sales',  description: 'Add manual product' },
  { key: 'F5',  labelKey: 'shortcuts.discount',   action: 'discount',         scope: 'sales',  description: 'Apply discount to sale' },
  { key: 'F6',  labelKey: 'shortcuts.customer',   action: 'customer',         scope: 'sales',  description: 'Search and assign customer' },
  { key: 'F7',  labelKey: 'shortcuts.clear',      action: 'clear-cart',       scope: 'sales',  description: 'Clear entire cart' },
  { key: 'F8',  labelKey: 'shortcuts.pause',      action: 'hold-ticket',      scope: 'sales',  description: 'Hold current ticket' },
  { key: '⌘K',  labelKey: 'shortcuts.commands',   action: 'command-palette',  scope: 'global', description: 'Command palette' },
  { key: 'F10', labelKey: 'shortcuts.config',     action: 'navigate-settings',scope: 'global', description: 'Go to settings' },
  { key: 'Esc', labelKey: 'shortcuts.close',      action: 'escape',           scope: 'modal',  description: 'Close modal or active panel' },
];

/** Payment-specific shortcuts (active inside PaymentModal) */
export const PAYMENT_SHORTCUTS: ShortcutDef[] = [
  { key: 'C', labelKey: 'shortcuts.cash',       action: 'pay-cash',     scope: 'modal', description: 'Select cash payment' },
  { key: 'T', labelKey: 'shortcuts.card',       action: 'pay-card',     scope: 'modal', description: 'Select card payment' },
  { key: 'R', labelKey: 'shortcuts.transfer',   action: 'pay-transfer', scope: 'modal', description: 'Select transfer payment' },
];

export function getShortcutByAction(action: string): ShortcutDef | undefined {
  return SHORTCUTS.find(s => s.action === action);
}

export function getShortcutKey(action: string): string | undefined {
  return getShortcutByAction(action)?.key;
}
