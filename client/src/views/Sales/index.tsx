import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ProductSearch } from '../../components/sales/ProductSearch';
import { Cart } from '../../components/sales/Cart';
import { PaymentModal } from '../../components/sales/PaymentModal';
import { QuickProducts } from '../../components/sales/QuickProducts';
import { useCartStore } from '../../store/cartStore';
import { useUserStore } from '../../store/userStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { CommandPalette, ShortcutsOverlay, useKeyboardShortcuts } from '../../components/common/CommandPalette';
import { api } from '../../lib/api';
import { enqueueSale, initSyncManager } from '../../lib/syncManager';
import { Plus, Zap, ShoppingBag, Command, Percent, XCircle, Check } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatMoney } from '../../utils/format';

function useScannerFocus() {
  const focusSearch = useCallback(() => {
    const input = document.querySelector('[data-scan-input]');
    if (input instanceof HTMLElement) input.focus();
  }, []);
  return focusSearch;
}

const SalesView = () => {
  const { items, getTotals, clearCart, addItem, validateStock, generateCheckoutId, updateQuantity, hydrate, setDiscount, discount } = useCartStore();
  const [isPayModalOpen, setPayModalOpen] = useState(false);
  const [isProcessing, setProcessing] = useState(false);
  const [isManualModalOpen, setManualModalOpen] = useState(false);
  const [isCmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [isShortcutsOpen, setShortcutsOpen] = useState(false);
  const [isDiscountOpen, setDiscountOpen] = useState(false);
  const [discountValue, setDiscountValue] = useState('');
  const [manualForm, setManualForm] = useState({ name: '', price: '' });
  const [payError, setPayError] = useState('');
  const [saleComplete, setSaleComplete] = useState<{ total: number; change: number; method: string } | null>(null);
  const toast = useToast();
  const saleCompleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusSearch = useScannerFocus();

  const handleShortcutAction = useCallback((action: string) => {
    switch (action) {
      case 'checkout':
        if (items.length > 0) setPayModalOpen(true);
        break;
      case 'focus-search': focusSearch(); break;
      case 'manual-product': setManualModalOpen(true); break;
      case 'clear-cart':
        if (items.length > 0) {
          clearCart();
          toast('Carrito vaciado', 'info');
          focusSearch();
        }
        break;
      case 'discount': setDiscountOpen(true); break;
      case 'customer': focusSearch(); break;
      case 'command-palette': setCmdPaletteOpen(true); break;
      case 'show-shortcuts': setShortcutsOpen(true); break;
      case 'escape': setCmdPaletteOpen(false); setShortcutsOpen(false); setDiscountOpen(false); break;
    }
  }, [items, clearCart, focusSearch, toast]);

  useKeyboardShortcuts(handleShortcutAction);

  useEffect(() => {
    const handleManual = () => setManualModalOpen(true);
    const handleCheckout = () => { if (items.length > 0) setPayModalOpen(true); };
    const handleClearCart = () => { if (items.length > 0) { clearCart(); toast('Carrito vaciado', 'info'); focusSearch(); } };
    const handleShortcuts = () => setShortcutsOpen(true);
    const handleLogout = () => { useUserStore.getState().logout(); window.location.href = '/login'; };
    const handleDiscount = () => setDiscountOpen(true);

    document.addEventListener('trigger-manual-product', handleManual);
    document.addEventListener('trigger-checkout', handleCheckout);
    document.addEventListener('trigger-clear-cart', handleClearCart);
    document.addEventListener('show-shortcuts', handleShortcuts);
    document.addEventListener('trigger-logout', handleLogout);
    document.addEventListener('trigger-discount', handleDiscount);
    return () => {
      document.removeEventListener('trigger-manual-product', handleManual);
      document.removeEventListener('trigger-checkout', handleCheckout);
      document.removeEventListener('trigger-clear-cart', handleClearCart);
      document.removeEventListener('show-shortcuts', handleShortcuts);
      document.removeEventListener('trigger-logout', handleLogout);
      document.removeEventListener('trigger-discount', handleDiscount);
    };
  }, [items, clearCart, focusSearch, toast]);

  useEffect(() => {
    hydrate();
    initSyncManager();
    focusSearch();
  }, [focusSearch, hydrate]);

  useEffect(() => {
    return () => {
      if (saleCompleteTimer.current) clearTimeout(saleCompleteTimer.current);
    };
  }, []);

  const showSaleComplete = useCallback((total: number, change: number, method: string) => {
    setSaleComplete({ total, change, method });
    if (saleCompleteTimer.current) clearTimeout(saleCompleteTimer.current);
    saleCompleteTimer.current = setTimeout(() => setSaleComplete(null), 4000);
  }, []);

  const dismissSaleComplete = useCallback(() => {
    setSaleComplete(null);
    if (saleCompleteTimer.current) clearTimeout(saleCompleteTimer.current);
    focusSearch();
  }, [focusSearch]);

  const handleApplyDiscount = useCallback(() => {
    const val = parseFloat(discountValue);
    if (isNaN(val) || val < 0) return;
    setDiscount(val);
    setDiscountOpen(false);
    setDiscountValue('');
    if (val > 0) toast(`Descuento de ${formatMoney(val)} aplicado`, 'info');
    focusSearch();
  }, [discountValue, setDiscount, toast, focusSearch]);

  const printTicket = useCallback((data: any) => {
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
          ${data.items.map((item: any) => `
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
          ${data.payments.map((p: any) => `<tr><td>Pago (${p.method}):</td><td class="right">$${p.amount.toFixed(2)}</td></tr>`).join('')}
          <tr class="bold"><td>Cambio:</td><td class="right">$${data.change.toFixed(2)}</td></tr>
        </table>
        <div class="center" style="margin-top:20px"><p>Gracias por su compra!</p></div>
        <script>window.onload = function() { window.print(); setTimeout(() => window.close(), 500); }; <\/script>
      </body></html>
    `;

    iframe.contentWindow?.document.open();
    iframe.contentWindow?.document.write(html);
    iframe.contentWindow?.document.close();
    setTimeout(() => document.body.removeChild(iframe), 3000);
  }, []);

  const handleCheckout = useCallback(async (paymentData: any) => {
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
        if (!navigator.onLine) throw new Error('offline');

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

        await enqueueSale({
          items: items.map((i: any) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
          total: totals.total,
          tax: totals.tax,
          discount: totals.discount,
          payment_method: paymentData.method,
          created_at: new Date(),
          idempotency_key: idempotencyKey,
        }, idempotencyKey);
        offlineMode = true;
      }

      printTicket({ items, totals, payments, change: paymentData.change || 0, date: new Date(), id: ticketId });
      clearCart();
      showSaleComplete(totals.total, paymentData.change || 0, paymentData.method);
      if (offlineMode) toast('Venta guardada localmente hasta que haya internet', 'info');
      focusSearch();
    } catch (e) {
      const msg = 'Error al procesar la venta: ' + (e instanceof Error ? e.message : '');
      setPayError(msg);
      toast(msg, 'error');
      throw e;
    } finally {
      setProcessing(false);
    }
  }, [items, validateStock, getTotals, generateCheckoutId, printTicket, clearCart, focusSearch, toast, showSaleComplete]);

  const handleAddManual = useCallback((e: React.FormEvent) => {
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

  const hasItems = items.length > 0;

  return (
    <div className="h-full min-h-0 flex gap-2 overflow-hidden">
      {/* Left Panel */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div className="flex gap-2">
          <div className="flex-1">
            <ProductSearch />
          </div>
          <button
            onClick={() => setManualModalOpen(true)}
            className="shrink-0 h-11 px-3 text-xs font-bold rounded-lg bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20 transition-colors flex items-center gap-1"
            title="Producto manual (F4)"
            aria-label="Agregar producto manual"
          >
            <Zap className="size-4" />
            <span className="hidden lg:inline">Manual</span>
          </button>
        </div>

        <div className="flex-1 rounded-lg border border-border/20 bg-card p-2 overflow-y-auto">
          <QuickProducts onSelect={(p) => { addItem(p); focusSearch(); }} />
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-full max-w-[380px] lg:max-w-[420px] xl:max-w-[440px] flex flex-col rounded-lg border border-border/20 bg-card h-full overflow-hidden min-w-[280px]">
        <div className="px-3 py-2 border-b border-border/20 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-xs flex items-center gap-1.5" id="cart-heading">
            <ShoppingBag className="size-3.5" />
            Carrito
            <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center" aria-live="polite">
              {items.length}
            </span>
          </h2>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setDiscountOpen(true)}
              disabled={!hasItems}
              className="text-[10px] font-semibold text-info hover:bg-info/10 px-2 py-1 rounded-md transition-colors disabled:opacity-30 flex items-center gap-0.5"
              title="Descuento (F5)"
            >
              <Percent className="size-3" />Dto
            </button>
            <button
              onClick={() => { clearCart(); toast('Carrito vaciado', 'info'); focusSearch(); }}
              disabled={!hasItems}
              className="text-[10px] font-semibold text-danger hover:bg-danger/10 px-2 py-1 rounded-md transition-colors disabled:opacity-30"
              aria-label="Vaciar carrito"
            >
              Vaciar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-1" role="region" aria-labelledby="cart-heading" aria-live="polite">
          <Cart />
        </div>

        {discount > 0 && (
          <div className="px-3 py-1 bg-info/10 border-t border-info/20 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-info">Descuento</span>
            <span className="font-bold text-info tabular-nums">-{formatMoney(discount)}</span>
          </div>
        )}

        {payError && (
          <div className="px-3 py-1.5 bg-danger/10 border-t-2 border-danger/20 flex items-center gap-1.5" role="alert">
            <span className="text-[11px] font-semibold text-danger">{payError}</span>
          </div>
        )}

        <div className="px-4 py-3 border-t border-border/20 space-y-2 shrink-0 pb-[env(safe-area-inset-bottom,0.75rem)]">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground font-medium">Total a pagar:</span>
            <span className="text-4xl font-black text-foreground tracking-tight tabular-nums">
              {formatMoney(totals.total)}
            </span>
          </div>

          {!hasItems && (
            <p className="text-[10px] text-muted-foreground/60 text-center font-medium">
              Escanee o busque productos para comenzar
            </p>
          )}

          <button
            className={cn(
              'w-full h-14 text-lg font-bold rounded-lg transition-all flex items-center justify-center gap-3',
              hasItems && !isProcessing
                ? 'bg-primary text-primary-foreground hover:brightness-110 active:brightness-90 shadow-sm'
                : 'bg-muted text-muted-foreground/40 cursor-not-allowed',
            )}
            disabled={!hasItems || isProcessing}
            onClick={openPayModal}
            aria-label={hasItems ? 'Cobrar' : 'Agregue productos primero'}
            title={!hasItems ? 'Agregue productos al carrito primero' : undefined}
          >
            <span>COBRAR</span>
            <span className="text-xs font-bold opacity-60 bg-black/15 px-1.5 py-0.5 rounded">F2</span>
          </button>
        </div>
      </div>

      {/* Sale complete feedback overlay - persists 4s */}
      {saleComplete && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40"
          onClick={dismissSaleComplete}
          role="alert"
          aria-live="assertive"
        >
          <div className="bg-card rounded-xl border border-success/30 shadow-2xl px-8 py-6 text-center max-w-xs animate-in">
            <div className="size-10 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-3">
              <Check className="size-6 text-success" />
            </div>
            <p className="text-lg font-black text-foreground mb-1">VENTA COMPLETADA</p>
            <p className="text-2xl font-black text-success tabular-nums mb-2">{formatMoney(saleComplete.total)}</p>
            {saleComplete.change > 0 && (
              <p className="text-sm font-semibold text-muted-foreground">
                Cambio: <span className="text-foreground tabular-nums">{formatMoney(saleComplete.change)}</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground/60 mt-2 font-medium">
              {saleComplete.method === 'cash' ? 'Efectivo' : saleComplete.method === 'card' ? 'Tarjeta' : saleComplete.method === 'transfer' ? 'Transferencia' : 'Mixto'}
            </p>
            <p className="text-[10px] text-muted-foreground/40 mt-4 font-medium">
              Toque en cualquier parte para continuar
            </p>
          </div>
        </div>
      )}

      {/* Manual product modal - unified */}
      <Modal
        open={isManualModalOpen}
        onClose={() => { setManualModalOpen(false); focusSearch(); }}
        title="Producto Manual"
        size="sm"
        onRestoreFocus={focusSearch}
      >
        <form onSubmit={handleAddManual} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Nombre del producto</label>
            <Input placeholder="Nombre del producto..." value={manualForm.name} onChange={e => setManualForm({ ...manualForm, name: e.target.value })} autoFocus required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Precio</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground z-10 text-sm">$</span>
              <Input className="pl-7" type="number" step="0.01" min="0" placeholder="0.00" value={manualForm.price} onChange={e => setManualForm({ ...manualForm, price: e.target.value })} required />
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full font-bold text-sm">
            Agregar al Carrito
          </Button>
        </form>
      </Modal>

      {/* Discount modal - unified */}
      <Modal
        open={isDiscountOpen}
        onClose={() => { setDiscountOpen(false); focusSearch(); }}
        title="Descuento"
        size="sm"
        onRestoreFocus={focusSearch}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Monto a descontar</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground z-10 text-sm">$</span>
              <Input
                className="pl-7"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={discountValue}
                onChange={e => setDiscountValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleApplyDiscount(); }}
                autoFocus
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1 text-xs" onClick={() => { setDiscountOpen(false); focusSearch(); }}>
              Cancelar
            </Button>
            <Button className="flex-1 text-xs" onClick={handleApplyDiscount} disabled={!discountValue || parseFloat(discountValue) <= 0}>
              Aplicar
            </Button>
          </div>
          {discount > 0 && (
            <button
              onClick={() => { setDiscount(0); setDiscountOpen(false); toast('Descuento eliminado', 'info'); focusSearch(); }}
              className="w-full text-xs font-semibold text-danger hover:bg-danger/10 py-1.5 rounded-md transition-colors"
            >
              Quitar descuento ({formatMoney(discount)})
            </button>
          )}
        </div>
      </Modal>

      {isPayModalOpen && (
        <PaymentModal
          total={totals.total}
          items={items}
          onClose={() => { setPayModalOpen(false); setPayError(''); focusSearch(); }}
          onConfirm={handleCheckout}
          isLoading={isProcessing}
        />
      )}

      <CommandPalette open={isCmdPaletteOpen} onClose={() => { setCmdPaletteOpen(false); focusSearch(); }} />
      <ShortcutsOverlay open={isShortcutsOpen} onClose={() => { setShortcutsOpen(false); focusSearch(); }} />
    </div>
  );
};

export default SalesView;
