import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ProductSearch } from '../../components/sales/ProductSearch';
import { Cart } from '../../components/sales/Cart';
import { PaymentModal } from '../../components/sales/PaymentModal';
import { QuickProducts } from '../../components/sales/QuickProducts';
import { ConfirmModal } from '../../components/sales/ConfirmModal';
import { useCartStore } from '../../store/cartStore';
import { useUserStore } from '../../store/userStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { CommandPalette, ShortcutsOverlay, useKeyboardShortcuts } from '../../components/common/CommandPalette';
import { api } from '../../lib/api';
import { enqueueSale, initSyncManager } from '../../lib/syncManager';
import { Plus, Zap, AlertTriangle, ShoppingBag, Command } from 'lucide-react';
import { cn } from '../../utils/cn';

const SalesView = () => {
  const { items, getTotals, clearCart, addItem, validateStock, generateCheckoutId, hydrate } = useCartStore();
  const [isPayModalOpen, setPayModalOpen] = useState(false);
  const [isProcessing, setProcessing] = useState(false);
  const [isManualModalOpen, setManualModalOpen] = useState(false);
  const [isClearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [isCmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [isShortcutsOpen, setShortcutsOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', price: '' });
  const [payError, setPayError] = useState('');
  const toast = useToast();

  const focusSearch = useCallback(() => {
    const input = document.querySelector('[data-scan-input]');
    if (input) input.focus();
  }, []);

  const handleShortcutAction = useCallback((action) => {
    switch (action) {
      case 'checkout':
        if (items.length > 0) setPayModalOpen(true);
        break;
      case 'focus-search': focusSearch(); break;
      case 'manual-product': setManualModalOpen(true); break;
      case 'clear-cart': if (items.length > 0) setClearConfirmOpen(true); break;
      case 'command-palette': setCmdPaletteOpen(true); break;
      case 'show-shortcuts': setShortcutsOpen(true); break;
      case 'escape': setCmdPaletteOpen(false); setShortcutsOpen(false); break;
    }
  }, [items, focusSearch]);

  useKeyboardShortcuts(handleShortcutAction);

  useEffect(() => {
    const handleManual = () => setManualModalOpen(true);
    const handleCheckout = () => { if (items.length > 0) setPayModalOpen(true); };
    const handleClearCart = () => { if (items.length > 0) setClearConfirmOpen(true); };
    const handleShortcuts = () => setShortcutsOpen(true);
    const handleLogout = () => { useUserStore.getState().logout(); window.location.href = '/login'; };

    document.addEventListener('trigger-manual-product', handleManual);
    document.addEventListener('trigger-checkout', handleCheckout);
    document.addEventListener('trigger-clear-cart', handleClearCart);
    document.addEventListener('show-shortcuts', handleShortcuts);
    document.addEventListener('trigger-logout', handleLogout);
    return () => {
      document.removeEventListener('trigger-manual-product', handleManual);
      document.removeEventListener('trigger-checkout', handleCheckout);
      document.removeEventListener('trigger-clear-cart', handleClearCart);
      document.removeEventListener('show-shortcuts', handleShortcuts);
      document.removeEventListener('trigger-logout', handleLogout);
    };
  }, [items]);

  useEffect(() => {
    hydrate();
    initSyncManager();
    focusSearch();
  }, [focusSearch, hydrate]);

  const printTicket = useCallback((data) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const html = `
      <html>
      <head><title>Ticket #${data.id}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; margin: 0 auto; color: #000; }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .line { border-top: 1px dashed #000; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; }
      </style></head>
      <body>
        <div class="center">
          <h2 style="margin:0">POS SYSTEM</h2>
          <p>Ticket: #${data.id}<br>Fecha: ${data.date.toLocaleString()}</p>
          <p class="line"></p>
        </div>
        <table>
          ${data.items.map(item => `
            <tr><td colspan="2">${item.name}</td></tr>
            <tr><td>${item.quantity} x $${item.price.toFixed(2)}</td><td class="right">$${(item.quantity * item.price).toFixed(2)}</td></tr>
          `).join('')}
        </table>
        <p class="line"></p>
        <table>
          <tr><td>Subtotal:</td><td class="right">$${data.totals.subtotal.toFixed(2)}</td></tr>
          <tr><td>IVA:</td><td class="right">$${data.totals.tax.toFixed(2)}</td></tr>
          ${data.totals.discount > 0 ? `<tr><td>Descuento:</td><td class="right">-$${data.totals.discount.toFixed(2)}</td></tr>` : ''}
          <tr class="bold" style="font-size:14px"><td>TOTAL:</td><td class="right">$${data.totals.total.toFixed(2)}</td></tr>
        </table>
        <p class="line"></p>
        <table>
          ${data.payments.map(p => `<tr><td>Pago (${p.method}):</td><td class="right">$${p.amount.toFixed(2)}</td></tr>`).join('')}
          <tr class="bold"><td>Cambio:</td><td class="right">$${data.change.toFixed(2)}</td></tr>
        </table>
        <div class="center" style="margin-top:20px"><p>Gracias por su compra!</p></div>
        <script>window.onload = function() { window.print(); setTimeout(() => window.close(), 500); }; <\\/script>
      </body></html>
    `;

    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();
    setTimeout(() => document.body.removeChild(iframe), 3000);
  }, []);

  const handleCheckout = useCallback(async (paymentData) => {
    setProcessing(true);
    setPayError('');

    const validation = validateStock();
    if (!validation.valid) {
      setPayError(validation.message);
      setProcessing(false);
      throw new Error(validation.message);
    }

    try {
      const totals = getTotals();
      const payments = paymentData.payments || [{ method: paymentData.method, amount: totals.total }];

      const payload = {
        items: items.map(i => ({ product_id: i.id, quantity: i.quantity, unit_price: i.price })),
        discount: totals.discount,
        payment_method: paymentData.method,
        payments,
      };

      const idempotencyKey = generateCheckoutId();
      let ticketId = idempotencyKey;
      let offlineMode = false;

      try {
        if (!navigator.onLine) {
          throw new Error('offline');
        }

        const res = await api('/sales', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'X-Idempotency-Key': idempotencyKey },
        });

        ticketId = res.id || idempotencyKey;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        const shouldQueueOffline = !navigator.onLine || /offline|failed to fetch|network error/i.test(message);

        if (!shouldQueueOffline) {
          const msg = 'Error al procesar la venta: ' + message;
          setPayError(msg);
          toast(msg, 'error');
          throw e;
        }

        await enqueueSale(
          {
            items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
            total: totals.total,
            tax: totals.tax,
            discount: totals.discount,
            payment_method: paymentData.method,
            created_at: new Date(),
            idempotency_key: idempotencyKey,
          },
          idempotencyKey,
        );
        offlineMode = true;
      }

      printTicket({ items, totals, payments, change: paymentData.change || 0, date: new Date(), id: ticketId });
      clearCart();
      toast(
        offlineMode
          ? 'Venta guardada localmente'
          : 'Venta completada',
        offlineMode ? 'warning' : 'success',
      );
      setTimeout(focusSearch, 50);
    } catch (e) {
      const msg = 'Error al procesar la venta: ' + e.message;
      setPayError(msg);
      toast(msg, 'error');
      throw e;
    } finally {
      setProcessing(false);
    }
  }, [items, validateStock, getTotals, generateCheckoutId, printTicket, clearCart, focusSearch, toast]);

  const handleAddManual = useCallback((e) => {
    e.preventDefault();
    if (!manualForm.name || !manualForm.price) return;

    addItem({
      id: crypto.randomUUID?.() || 'manual-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      name: manualForm.name,
      price: parseFloat(manualForm.price),
      stock: 999999,
      isManual: true,
    });

    setManualForm({ name: '', price: '' });
    setManualModalOpen(false);
    toast(`"${manualForm.name}" agregado`, 'success');
    focusSearch();
  }, [manualForm, addItem, focusSearch, toast]);

  const openPayModal = useCallback(() => {
    const validation = validateStock();
    if (!validation.valid) {
      setPayError(validation.message);
      toast(validation.message, 'warning');
      return;
    }
    setPayError('');
    setPayModalOpen(true);
  }, [validateStock, toast]);

  const totals = useMemo(() => getTotals(), [items, getTotals]);

  return (
    <div className="h-full min-h-0 flex gap-3 overflow-hidden">
      {/* Left Panel */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="flex gap-2">
          <div className="flex-1">
            <ProductSearch />
          </div>
          <button
            onClick={() => setManualModalOpen(true)}
            className="shrink-0 h-12 px-4 text-sm font-bold rounded-lg bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20 active:scale-95 transition-all min-h-[44px]"
            title="Producto manual"
            aria-label="Agregar producto manual"
          >
            <Zap className="size-4" />
            <span className="hidden lg:inline ml-1">Manual</span>
          </button>
        </div>

        <div className="flex-1 rounded-lg border border-border/30 bg-card p-3 overflow-y-auto">
          <QuickProducts onSelect={(p) => { addItem(p); focusSearch(); }} />
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-[var(--pos-cart-width)] flex flex-col rounded-lg border border-border/30 bg-card shadow-sm h-full overflow-hidden">
        {/* Cart header */}
        <div className="p-3 border-b border-border/30 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-sm flex items-center gap-1.5" id="cart-heading">
            <ShoppingBag className="size-4" />
            Carrito
            <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center" aria-live="polite">
              {items.length}
            </span>
          </h2>
          <button
            onClick={() => { if (items.length > 0) setClearConfirmOpen(true); }}
            disabled={items.length === 0}
            className="text-xs font-semibold text-danger hover:bg-danger/10 px-2 py-1 rounded-lg transition-colors disabled:opacity-30 min-h-[36px]"
            aria-label="Vaciar carrito"
          >
            Vaciar
          </button>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3" role="region" aria-labelledby="cart-heading" aria-live="polite">
          <Cart />
        </div>

        {/* Error */}
        {payError && (
          <div className="px-4 py-2 bg-danger/10 border-t-2 border-danger/20 flex items-center gap-2" role="alert">
            <AlertTriangle className="size-4 text-danger shrink-0" />
            <p className="text-xs font-semibold text-danger">{payError}</p>
          </div>
        )}

        {/* Totals + Checkout */}
        <div className="p-4 pt-3 border-t border-border/30 space-y-3 shrink-0">
          <div className="flex justify-between items-end">
            <span className="text-muted-foreground font-medium text-xs">Total a pagar:</span>
            <span className="text-2xl font-bold text-primary tracking-tight">
              ${totals.total.toFixed(2)}
            </span>
          </div>

          <button
            className={cn(
              'w-full h-14 text-lg font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-3 active:scale-[0.98] min-h-[48px]',
              items.length > 0 && !isProcessing
                ? 'bg-primary text-primary-foreground hover:brightness-110'
                : 'bg-muted text-muted-foreground/50 cursor-not-allowed',
            )}
            disabled={items.length === 0 || isProcessing}
            onClick={openPayModal}
            aria-label="Cobrar"
          >
            <span>COBRAR</span>
            <div className="h-5 w-px bg-primary-foreground/20" />
            <span className="text-xs font-bold opacity-80">F2</span>
          </button>
        </div>
      </div>

      {/* Manual product modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100]" role="dialog" aria-modal="true" aria-label="Producto manual">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold">Producto Manual</h2>
              <button onClick={() => setManualModalOpen(false)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
                <Plus className="size-4 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddManual} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Nombre</label>
                <Input placeholder="Nombre del producto..." value={manualForm.name} onChange={e => setManualForm({ ...manualForm, name: e.target.value })} autoFocus required />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Precio</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground z-10">$</span>
                  <Input className="pl-7" type="number" step="0.01" min="0" placeholder="0.00" value={manualForm.price} onChange={e => setManualForm({ ...manualForm, price: e.target.value })} required />
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full font-bold">
                Agregar al Carrito
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Clear cart confirm */}
      <ConfirmModal
        open={isClearConfirmOpen}
        title="Vaciar carrito"
        message="Se eliminarán todos los productos del carrito."
        confirmLabel="Vaciar"
        variant="danger"
        onConfirm={() => { clearCart(); setClearConfirmOpen(false); toast('Carrito vaciado', 'info'); }}
        onCancel={() => setClearConfirmOpen(false)}
      />

      {isPayModalOpen && !isManualModalOpen && (
        <PaymentModal
          total={totals.total}
          items={items}
          onClose={() => { setPayModalOpen(false); setPayError(''); }}
          onConfirm={handleCheckout}
          isLoading={isProcessing}
        />
      )}

      <CommandPalette open={isCmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />
      <ShortcutsOverlay open={isShortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Command palette trigger */}
      <div className="fixed bottom-3 left-3 z-40">
        <button
          onClick={() => setCmdPaletteOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-card border border-border shadow-sm text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          title="Paleta de comandos (⌘K)"
          aria-label="Abrir paleta de comandos"
        >
          <Command className="size-3" />
          <kbd className="text-[9px] font-bold bg-muted px-1 py-0.5 rounded">⌘K</kbd>
        </button>
      </div>
    </div>
  );
};

export default SalesView;
