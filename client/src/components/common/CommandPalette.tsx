import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ShoppingCart, Package, Users, DollarSign, FileText, Settings,
  LogOut, HelpCircle, Zap, X, ArrowRight, Command,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface Command {
  id: string; label: string; description: string; icon: React.ReactNode;
  action: () => void; shortcut?: string; keywords: string[];
}

interface CommandPaletteProps { open: boolean; onClose: () => void; }

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const focusSearch = useCallback(() => {
    const input = document.querySelector('input[placeholder*="Escanear"]');
    if (input) (input as HTMLInputElement).focus();
  }, []);

  const commands: Command[] = [
    { id: 'sales', label: 'Ir a Ventas', description: 'Pantalla principal de ventas', icon: <ShoppingCart className="h-4 w-4" />, action: () => { navigate('/ventas'); onClose(); }, shortcut: 'G,V', keywords: ['ventas', 'cobrar', 'vender', 'punto de venta'] },
    { id: 'products', label: 'Buscar Producto', description: 'Buscar producto por nombre o SKU', icon: <Package className="h-4 w-4" />, action: () => { navigate('/ventas'); onClose(); setTimeout(() => focusSearch(), 100); }, shortcut: 'F3', keywords: ['producto', 'buscar', 'sku', 'codigo', 'scanner'] },
    { id: 'manual', label: 'Producto Manual', description: 'Agregar producto no registrado', icon: <Zap className="h-4 w-4" />, action: () => { document.dispatchEvent(new CustomEvent('trigger-manual-product')); onClose(); }, shortcut: 'F4', keywords: ['manual', 'generico', 'no registrado'] },
    { id: 'customers', label: 'Clientes', description: 'Gestionar clientes', icon: <Users className="h-4 w-4" />, action: () => { navigate('/clientes'); onClose(); }, shortcut: 'G,C', keywords: ['cliente', 'clientes', 'persona'] },
    { id: 'cash', label: 'Abrir/Cerrar Caja', description: 'Control de caja', icon: <DollarSign className="h-4 w-4" />, action: () => { navigate('/caja'); onClose(); }, shortcut: 'G,X', keywords: ['caja', 'efectivo', 'dinero', 'apertura', 'cierre'] },
    { id: 'reports', label: 'Reportes', description: 'Reportes de ventas', icon: <FileText className="h-4 w-4" />, action: () => { navigate('/reportes'); onClose(); }, shortcut: 'G,R', keywords: ['reporte', 'reportes', 'graficos', 'estadisticas'] },
    { id: 'settings', label: 'Configuración', description: 'Configuración del negocio', icon: <Settings className="h-4 w-4" />, action: () => { navigate('/config'); onClose(); }, shortcut: 'G,S', keywords: ['configuracion', 'ajustes', 'settings'] },
    { id: 'help', label: 'Ayuda', description: 'Atajos de teclado y ayuda', icon: <HelpCircle className="h-4 w-4" />, action: () => { onClose(); setTimeout(() => document.dispatchEvent(new CustomEvent('show-shortcuts')), 100); }, shortcut: 'F1', keywords: ['ayuda', 'help', 'atajos', 'shortcuts', 'teclas'] },
    { id: 'logout', label: 'Cerrar Sesión', description: 'Salir del sistema', icon: <LogOut className="h-4 w-4" />, action: () => { onClose(); setTimeout(() => document.dispatchEvent(new CustomEvent('trigger-logout')), 100); }, shortcut: 'G,Q', keywords: ['salir', 'cerrar', 'sesion', 'logout', 'exit'] },
    { id: 'clear-cart', label: 'Vaciar Carrito', description: 'Eliminar todos los productos del carrito', icon: <X className="h-4 w-4" />, action: () => { document.dispatchEvent(new CustomEvent('trigger-clear-cart')); onClose(); }, shortcut: 'F7', keywords: ['vaciar', 'carrito', 'limpiar', 'clear'] },
    { id: 'checkout', label: 'Cobrar', description: 'Procesar pago del carrito actual', icon: <ArrowRight className="h-4 w-4" />, action: () => { document.dispatchEvent(new CustomEvent('trigger-checkout')); onClose(); }, shortcut: 'F2', keywords: ['cobrar', 'pago', 'pagar', 'checkout', 'payment', 'total'] },
    { id: 'discount', label: 'Descuento', description: 'Aplicar descuento a la venta', icon: <DollarSign className="h-4 w-4" />, action: () => { document.dispatchEvent(new CustomEvent('trigger-discount')); onClose(); }, shortcut: 'F5', keywords: ['descuento', 'discount', 'rebaja', 'promocion'] },
  ];

  const filtered = query.trim() === ''
    ? commands
    : commands.filter((cmd) => {
        const q = query.toLowerCase();
        return cmd.label.toLowerCase().includes(q) ||
          cmd.keywords.some((k) => k.toLowerCase().includes(q));
      });

  useEffect(() => {
    if (open) { setQuery(''); setSelectedIndex(0); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && filtered[selectedIndex]) { e.preventDefault(); filtered[selectedIndex].action(); }
    else if (e.key === 'Escape') { onClose(); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" role="dialog" aria-modal="true" aria-label="Paleta de comandos">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <Command className="h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef} type="text" placeholder="Buscar comandos..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            className="flex-1 text-lg outline-none bg-transparent placeholder:text-muted-foreground/50 text-foreground"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground bg-muted rounded-md">
            <Command className="h-3 w-3" />K
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No se encontraron comandos para "{query}"</p>
            </div>
          )}
          {filtered.map((cmd, index) => (
            <button
              key={cmd.id}
              onClick={cmd.action}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all',
                index === selectedIndex
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'hover:bg-muted text-foreground',
              )}
            >
              <span className={cn('shrink-0', index === selectedIndex ? 'text-primary' : 'text-muted-foreground')}>
                {cmd.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{cmd.label}</div>
                <div className="text-xs text-muted-foreground truncate">{cmd.description}</div>
              </div>
              {cmd.shortcut && (
                <kbd className="shrink-0 px-2 py-1 text-[10px] font-bold text-muted-foreground bg-muted rounded-md">
                  {cmd.shortcut}
                </kbd>
              )}
            </button>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground">
          <span>↑↓ Navegar</span>
          <span>↵ Seleccionar</span>
          <span>Esc Cerrar</span>
        </div>
      </div>
    </div>
  );
};

// ─── Keyboard Shortcuts Hook ───

export function useKeyboardShortcuts(onAction: (action: string) => void): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.key === 'F2') { e.preventDefault(); onAction('checkout'); }
      if (e.key === 'F3' && !isInput) { e.preventDefault(); onAction('focus-search'); }
      if (e.key === 'F4' && !isInput) { e.preventDefault(); onAction('manual-product'); }
      if (e.key === 'F5' && !isInput) { e.preventDefault(); onAction('discount'); }
      if (e.key === 'F6' && !isInput) { e.preventDefault(); onAction('customer'); }
      if (e.key === 'F7') { e.preventDefault(); onAction('clear-cart'); }
      if (e.key === 'F8') { e.preventDefault(); onAction('clear-cart'); }
      if (e.key === 'F1' && !isInput) { e.preventDefault(); onAction('show-shortcuts'); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); onAction('command-palette'); }
      if (e.key === 'Escape') { onAction('escape'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onAction]);
}

// ─── Shortcuts Overlay ───

export const ShortcutsOverlay: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  if (!open) return null;

  const shortcuts = [
    { key: 'F1', label: 'Ayuda / Atajos' },
    { key: 'F2', label: 'Cobrar' },
    { key: 'F3', label: 'Buscar producto' },
    { key: 'F4', label: 'Producto manual' },
    { key: 'F5', label: 'Descuento' },
    { key: 'F6', label: 'Cliente' },
    { key: 'F7', label: 'Vaciar carrito' },
    { key: 'F8', label: 'Cancelar venta' },
    { key: '⌘K', label: 'Paleta de comandos' },
    { key: 'C', label: 'Efectivo (en cobro)' },
    { key: 'T', label: 'Tarjeta (en cobro)' },
    { key: 'R', label: 'Transferencia (en cobro)' },
    { key: 'Esc', label: 'Cerrar modal' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Atajos de teclado">
        <h2 className="text-lg font-bold mb-4 text-foreground">Atajos de Teclado</h2>
        <div className="space-y-1">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted">
              <span className="text-sm text-foreground">{s.label}</span>
              <kbd className="px-3 py-1.5 text-xs font-bold bg-muted text-muted-foreground rounded-lg">{s.key}</kbd>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="w-full mt-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:brightness-110 transition-all">
          Cerrar
        </button>
      </div>
    </div>
  );
};
