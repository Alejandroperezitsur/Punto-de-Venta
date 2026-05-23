import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ProductSearch } from '../../components/sales/ProductSearch';
import { Cart } from '../../components/sales/Cart';
import { PaymentModal } from '../../components/sales/PaymentModal';
import { QuickProducts } from '../../components/sales/QuickProducts';
import { ConfirmModal } from '../../components/sales/ConfirmModal';
import { useCartStore } from '../../store/cartStore';
import { useUserStore } from '../../store/userStore';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { CommandPalette, ShortcutsOverlay, useKeyboardShortcuts } from '../../components/common/CommandPalette';
import { api } from '../../lib/api';
import { initSyncManager } from '../../lib/syncManager';
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

  const focusSearch = useCallback(() => {
    const input = document.querySelector('input[placeholder*="Escanear"]');
    if (input) (input as HTMLInputElement).focus();
  }, []);

  const handleShortcutAction = useCallback((action: string) => {
    switch (action) {
      case 'checkout':
        if (items.length > 0) setPayModalOpen(true);
        break;
      case 'focus-search':
        focusSearch();
        break;
      case 'manual-product':
        setManualModalOpen(true);
        break;
      case 'clear-cart':
        if (items.length > 0) setClearConfirmOpen(true);
        break;
      case 'command-palette':
        setCmdPaletteOpen(true);
        break;
      case 'show-shortcuts':
        setShortcutsOpen(true);
        break;
      case 'escape':
        setCmdPaletteOpen(false);
        setShortcutsOpen(false);
        break;
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

  const printTicket = useCallback((data: { items: any[]; totals: any; payments: any[]; change: number; date: Date; id: any }) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const html = `
      <html>
      <head>
        <title>Ticket #${data.id}</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; margin: 0 auto; color: #000; }
          .center { text-align: center; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; }
          td { vertical-align: top; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="center">
          <h2 style="margin:0">POS SYSTEM</h2>
          <p>Ticket: #${data.id}<br>
          Fecha: ${data.date.toLocaleString()}</p>
          <p class="line"></p>
        </div>
        <table>
          ${data.items.map((item: any) => `
            <tr>
              <td colspan="2">${item.name}</td>
            </tr>
            <tr>
              <td>${item.quantity} x $${(item.price).toFixed(2)}</td>
              <td class="right">$${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
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
        <div class="center" style="margin-top:20px">
          <p>Gracias por su compra!</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(() => window.close(), 500);
          };
        \x3C/script>
      </body>
      </html>
    `;

    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();

    setTimeout(() => document.body.removeChild(iframe), 3000);
  }, []);

  const handleCheckout = useCallback(async (paymentData: { method: string; change?: number; payments?: Array<{ method: string; amount: number }> }) => {
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
        items: items.map(i => ({
          product_id: i.id,
          quantity: i.quantity,
          unit_price: i.price
        })),
        discount: totals.discount,
        payment_method: paymentData.method,
        payments
      };

      const idempotencyKey = generateCheckoutId();

      const res = await api('/sales', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'X-Idempotency-Key': idempotencyKey }
      });

      printTicket({
        items,
        totals,
        payments,
        change: paymentData.change || 0,
        date: new Date(),
        id: res.id
      });

      clearCart();
      setPayModalOpen(false);
      setTimeout(focusSearch, 100);
    } catch (e) {
      setPayError('Error al procesar la venta: ' + (e as Error).message);
      setProcessing(false);
      throw e;
    }
  }, [items, validateStock, getTotals, generateCheckoutId, printTicket, clearCart, focusSearch]);

  const handleAddManual = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.name || !manualForm.price) return;

    const id = crypto.randomUUID
      ? crypto.randomUUID()
      : 'manual-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

    addItem({
      id,
      name: manualForm.name,
      price: parseFloat(manualForm.price),
      stock: 999999,
      isManual: true
    });

    setManualForm({ name: '', price: '' });
    setManualModalOpen(false);
    focusSearch();
  }, [manualForm, addItem, focusSearch]);

  const openPayModal = useCallback(() => {
    const validation = validateStock();
    if (!validation.valid) {
      setPayError(validation.message);
      return;
    }
    setPayError('');
    setPayModalOpen(true);
  }, [validateStock]);

  const totals = useMemo(() => getTotals(), [items, getTotals]);

  return (
    <div className="h-[calc(100vh-80px)] flex gap-4 p-2 overflow-hidden bg-[var(--bg)]" role="region" aria-label="Pantalla de ventas">
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)] shadow-sm flex gap-3">
          <div className="flex-1">
            <ProductSearch />
          </div>
          <Button
            onClick={() => setManualModalOpen(true)}
            className="h-14 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center gap-2 min-h-[56px]"
            title="Venta de producto no registrado"
            aria-label="Agregar producto manual"
          >
            <Zap className="h-5 w-5" />
            <span className="hidden lg:inline">Producto Manual</span>
          </Button>
        </div>

        <div className="flex-1 bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 overflow-y-auto">
          <QuickProducts onSelect={(p) => { addItem(p); focusSearch(); }} />
        </div>
      </div>

      <div className="w-[450px] flex flex-col bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl h-full overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-muted)] flex justify-between items-center">
          <h2 className="font-bold text-lg flex items-center gap-2" id="cart-heading">
            <ShoppingBag className="h-5 w-5" />
            Carrito
            <span className="bg-[hsl(var(--primary))] text-white text-xs px-2.5 py-1 rounded-full shadow-sm" aria-live="polite">{items.length}</span>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:bg-red-50 h-10 px-4 font-bold"
            onClick={() => { if (items.length > 0) setClearConfirmOpen(true); }}
            disabled={items.length === 0}
            aria-label="Vaciar carrito"
          >
            Vaciar
          </Button>
        </div>

        <div className="flex-1 overflow-hidden relative" role="region" aria-labelledby="cart-heading" aria-live="polite">
          <Cart />
        </div>

        {payError && (
          <div className="px-6 py-3 bg-red-50 border-t-2 border-red-200 flex items-center gap-2" role="alert">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm font-bold text-red-700">{payError}</p>
          </div>
        )}

        <div className="p-6 bg-[var(--bg)] border-t-2 border-[var(--border)] space-y-4 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-end mb-2">
            <span className="text-[var(--muted-foreground)] font-medium">Total a pagar:</span>
            <span className="text-5xl font-black text-[hsl(var(--primary))] tracking-tighter">
              ${totals.total.toFixed(2)}
            </span>
          </div>

          <Button
            className="w-full h-20 text-4xl font-black shadow-lg shadow-[hsl(var(--primary))/0.25] rounded-2xl active:scale-[0.97] transition-all flex items-center justify-center gap-4 tracking-tight"
            disabled={items.length === 0 || isProcessing}
            onClick={openPayModal}
            aria-label="Cobrar"
          >
            <span>COBRAR</span>
            <div className="h-10 w-px bg-white/20" />
            <span className="text-2xl">F2</span>
          </Button>
        </div>
      </div>

      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Producto manual">
          <div className="bg-[var(--card)] w-full max-w-md p-8 rounded-[2rem] shadow-2xl border-4 border-[var(--border)] animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setManualModalOpen(false)}
              className="absolute top-6 right-6 p-2 hover:bg-red-50 text-red-500 rounded-xl"
              aria-label="Cerrar"
            >
              <Plus className="h-6 w-6 rotate-45" />
            </button>
            <h2 className="text-2xl font-black mb-6 tracking-tight">Producto Manual</h2>
            <form onSubmit={handleAddManual} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nombre</label>
                <Input
                  placeholder="Nombre del producto..."
                  value={manualForm.name}
                  onChange={e => setManualForm({ ...manualForm, name: e.target.value })}
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Precio</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
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
              <Button type="submit" className="w-full h-16 text-xl font-black rounded-xl">
                Agregar al Carrito
              </Button>
            </form>
          </div>
        </div>
      )}

      {isPayModalOpen && (
        <PaymentModal
          total={totals.total}
          items={items}
          onClose={() => { setPayModalOpen(false); setPayError(''); }}
          onConfirm={handleCheckout}
          isLoading={isProcessing}
        />
      )}

      <ConfirmModal
        open={isClearConfirmOpen}
        title="Vaciar carrito"
        message="Se eliminaran todos los productos del carrito. Esta accion no se puede deshacer."
        confirmLabel="Vaciar"
        variant="danger"
        onConfirm={() => { clearCart(); setClearConfirmOpen(false); }}
        onCancel={() => setClearConfirmOpen(false)}
      />

      <CommandPalette open={isCmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />
      <ShortcutsOverlay open={isShortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <div className="fixed bottom-4 left-4 z-40">
        <button
          onClick={() => setCmdPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg text-xs font-semibold text-gray-500 hover:bg-white hover:text-gray-700 transition-all"
          title="Paleta de comandos (⌘K)"
          aria-label="Abrir paleta de comandos"
        >
          <Command className="h-3.5 w-3.5" />
          <kbd className="text-[10px] font-bold bg-gray-100 px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>
      </div>
    </div>
  );
};

export default SalesView;
