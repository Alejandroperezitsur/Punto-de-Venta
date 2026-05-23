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
import { initSyncManager } from '../../lib/syncManager';
import { Plus, Zap, AlertTriangle, ShoppingBag, Command } from 'lucide-react';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';

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
      const res = await api('/sales', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'X-Idempotency-Key': idempotencyKey },
      });

      printTicket({ items, totals, payments, change: paymentData.change || 0, date: new Date(), id: res.id });
      clearCart();
      toast('Venta completada exitosamente', 'success');
      setTimeout(focusSearch, 100);
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
    toast(`"${manualForm.name}" agregado al carrito`, 'success');
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
    <div className="h-[calc(100vh-var(--header-height)-2rem)] flex gap-4 overflow-hidden">
      {/* Left Panel */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex gap-3">
          <div className="flex-1">
            <ProductSearch />
          </div>
          <Button
            onClick={() => setManualModalOpen(true)}
            variant="warning"
            size="lg"
            className="shrink-0 h-16 px-6 font-bold min-h-[56px]"
            title="Producto manual (no registrado)"
            aria-label="Agregar producto manual"
          >
            <Zap className="size-5" />
            <span className="hidden lg:inline">Manual</span>
          </Button>
        </div>

        <div className="flex-1 rounded-3xl border border-border bg-card p-5 overflow-y-auto">
          <QuickProducts onSelect={(p) => { addItem(p); focusSearch(); }} />
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-[440px] flex flex-col rounded-3xl border border-border bg-card shadow-xl h-full overflow-hidden">
        {/* Cart header */}
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
          <h2 className="font-bold flex items-center gap-2" id="cart-heading">
            <ShoppingBag className="size-5" />
            Carrito
            <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full shadow-sm font-bold min-w-[24px] text-center" aria-live="polite">
              {items.length}
            </span>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { if (items.length > 0) setClearConfirmOpen(true); }}
            disabled={items.length === 0}
            className="text-danger hover:bg-danger/10 font-bold"
            aria-label="Vaciar carrito"
          >
            Vaciar
          </Button>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-4" role="region" aria-labelledby="cart-heading" aria-live="polite">
          <Cart />
        </div>

        {/* Error */}
        {payError && (
          <div className="px-5 py-3 bg-danger/10 border-t-2 border-danger/20 flex items-center gap-2" role="alert">
            <AlertTriangle className="size-5 text-danger shrink-0" />
            <p className="text-sm font-bold text-danger">{payError}</p>
          </div>
        )}

        {/* Totals + Checkout */}
        <div className="p-5 bg-muted/20 border-t-2 border-border space-y-4 shrink-0">
          <div className="flex justify-between items-end">
            <span className="text-muted-foreground font-semibold">Total a pagar:</span>
            <motion.span
              key={totals.total}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="text-5xl font-black text-primary tracking-tighter"
            >
              ${totals.total.toFixed(2)}
            </motion.span>
          </div>

          <Button
            size="xl"
            className="w-full h-20 text-3xl font-black shadow-lg shadow-primary/25 rounded-3xl active:scale-[0.97] transition-all flex items-center justify-center gap-4 tracking-tight"
            disabled={items.length === 0 || isProcessing}
            onClick={openPayModal}
            aria-label="Cobrar"
          >
            <span>COBRAR</span>
            <div className="h-8 w-px bg-primary-foreground/20" />
            <span className="text-xl font-bold opacity-80">F2</span>
          </Button>
        </div>
      </div>

      {/* Manual product modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" role="dialog" aria-modal="true" aria-label="Producto manual">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="bg-card w-full max-w-md rounded-4xl border border-border shadow-2xl p-8"
          >
            <button
              onClick={() => setManualModalOpen(false)}
              className="float-right p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
              aria-label="Cerrar"
            >
              <Plus className="size-6 rotate-45" />
            </button>
            <h2 className="text-2xl font-black mb-6 tracking-tight">Producto Manual</h2>
            <form onSubmit={handleAddManual} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Nombre</label>
                <Input
                  placeholder="Nombre del producto..."
                  value={manualForm.name}
                  onChange={e => setManualForm({ ...manualForm, name: e.target.value })}
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Precio</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground z-10">$</span>
                  <Input
                    className="pl-8"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={manualForm.price}
                    onChange={e => setManualForm({ ...manualForm, price: e.target.value })}
                    required
                  />
                </div>
              </div>
              <Button type="submit" size="xl" className="w-full font-bold">
                Agregar al Carrito
              </Button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Clear cart confirm */}
      <ConfirmModal
        open={isClearConfirmOpen}
        title="Vaciar carrito"
        message="Se eliminarán todos los productos del carrito. Esta acción no se puede deshacer."
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
      <div className="fixed bottom-4 left-4 z-40">
        <button
          onClick={() => setCmdPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-2.5 rounded-2xl glass-strong shadow-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
          title="Paleta de comandos (⌘K)"
          aria-label="Abrir paleta de comandos"
        >
          <Command className="size-3.5" />
          <kbd className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded-lg">⌘K</kbd>
        </button>
      </div>
    </div>
  );
};

export default SalesView;
