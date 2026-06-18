/**
 * Single source of truth for all keyboard shortcuts in the POS.
 * Used by Sidebar labels, useKeyboardShortcuts, CommandPalette, and ShortcutsOverlay.
 */
export interface ShortcutDef {
  key: string;
  label: string;
  action: string;
  scope: 'global' | 'sales' | 'modal';
  description: string;
}

export const SHORTCUTS: ShortcutDef[] = [
  { key: 'F1',  label: 'Ayuda',              action: 'show-shortcuts',   scope: 'global', description: 'Mostrar atajos de teclado' },
  { key: 'F2',  label: 'Cobrar',             action: 'checkout',         scope: 'sales',  description: 'Abrir panel de cobro' },
  { key: 'F3',  label: 'Buscar',             action: 'focus-search',     scope: 'sales',  description: 'Enfocar buscador/escáner' },
  { key: 'F4',  label: 'Manual',             action: 'manual-product',   scope: 'sales',  description: 'Agregar producto manual' },
  { key: 'F5',  label: 'Descuento',          action: 'discount',         scope: 'sales',  description: 'Aplicar descuento a la venta' },
  { key: 'F6',  label: 'Cliente',            action: 'customer',         scope: 'sales',  description: 'Buscar y asignar cliente' },
  { key: 'F7',  label: 'Vaciar',             action: 'clear-cart',       scope: 'sales',  description: 'Vaciar carrito completo' },
  { key: 'F8',  label: 'Pausar',             action: 'hold-ticket',      scope: 'sales',  description: 'Pausar ticket actual' },
  { key: '⌘K',  label: 'Comandos',           action: 'command-palette',  scope: 'global', description: 'Paleta de comandos' },
  { key: 'F10', label: 'Config',             action: 'navigate-settings',scope: 'global', description: 'Ir a configuración' },
  { key: 'Esc', label: 'Cerrar',             action: 'escape',           scope: 'modal',  description: 'Cerrar modal o panel activo' },
];

/** Payment-specific shortcuts (active inside PaymentModal) */
export const PAYMENT_SHORTCUTS: ShortcutDef[] = [
  { key: 'C', label: 'Efectivo',       action: 'pay-cash',     scope: 'modal', description: 'Seleccionar pago en efectivo' },
  { key: 'T', label: 'Tarjeta',        action: 'pay-card',     scope: 'modal', description: 'Seleccionar pago con tarjeta' },
  { key: 'R', label: 'Transferencia',  action: 'pay-transfer', scope: 'modal', description: 'Seleccionar transferencia' },
];

export function getShortcutByAction(action: string): ShortcutDef | undefined {
  return SHORTCUTS.find(s => s.action === action);
}

export function getShortcutKey(action: string): string | undefined {
  return getShortcutByAction(action)?.key;
}
