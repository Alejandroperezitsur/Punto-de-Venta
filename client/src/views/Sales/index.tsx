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
import { useScannerFocusEngine } from '../../hooks/useScannerFocusEngine';
import { api } from '../../lib/api';
import { enqueueSale, initSyncManager } from '../../lib/syncManager';
import { Plus, Zap, ShoppingBag, Command, Percent, XCircle, Check, Lock, Wallet, UserPlus, X, Pause, Play, Clock } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatMoney } from '../../utils/format';

const CheckoutButton = React.memo(function CheckoutButton({
  hasItems,
  isProcessing,
  totals,
  onCheckout,
}: {
  hasItems: boolean;
  isProcessing: boolean;
  totals: { total: number };
  onCheckout: () => void;
}) {
  return (
    <button
      className={cn(
        'w-full min-h-[var(--pos-btn-checkout-height)] text-base font-bold rounded-lg transition-all flex items-center justify-center gap-3',
        hasItems && !isProcessing
          ? 'bg-pos-checkout text-success-foreground hover:brightness-110 active:brightness-95 shadow-sm'
          : 'bg-muted text-muted-foreground/40 cursor-not-allowed',
      )}
      disabled={!hasItems || isProcessing}
      onClick={onCheckout}
      aria-label={hasItems ? 'Cobrar' : 'Agregue productos primero'}
      title={!hasItems ? 'Agregue productos al carrito primero' : undefined}
    >
      {isProcessing ? (
        <><span className="size-2 rounded-full bg-current animate-pulse" />Procesando...</>
      ) : (
        <><span>COBRAR</span><span className="text-xs font-bold opacity-60 bg-black/15 px-1.5 py-0.5 rounded ml-1">F2</span></>
      )}
    </button>
  );
});

const CustomerSearchModal = React.memo(function CustomerSearchModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (c: { id: number; name: string }) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api(`/customers?search=${encodeURIComponent(query.trim())}&take=10`);
        const data = Array.isArray(res) ? res : res.data || [];
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" role="dialog" aria-modal="true" aria-label="Buscar cliente">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <UserPlus className="h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar cliente por nombre o teléfono..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
            className="flex-1 text-base outline-none bg-transparent placeholder:text-muted-foreground/50 text-foreground"
            autoFocus
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {loading && <p className="text-center text-muted-foreground text-sm py-4">Buscando...</p>}
          {!loading && query.length >= 2 && results.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4">No se encontraron clientes</p>
          )}
          {results.map(c => (
            <button
              key={c.id}
              onClick={() => onSelect({ id: c.id, name: c.name })}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-muted transition-colors"
            >
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {c.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate text-foreground">{c.name}</p>
                {c.phone && <p className="text-xs text-muted-foreground truncate">{c.phone}</p>}
              </div>
            </button>
          ))}
          {!loading && query.length < 2 && (
            <p className="text-center text-muted-foreground/60 text-xs py-6">Escribe al menos 2 caracteres para buscar</p>
          )}
        </div>
      </div>
    </div>
  );
});

const SalesView = React.memo(function SalesView() {
  const items = useCartStore(s => s.items);
  const addItem = useCartStore(s => s.addItem);
  const clearCart = useCartStore(s => s.clearCart);
  const updateQuantity = useCartStore(s => s.updateQuantity);
  const validateStock = useCartStore(s => s.validateStock);
  const generateCheckoutId = useCartStore(s => s.generateCheckoutId);
  const hydrate = useCartStore(s => s.hydrate);
  const setDiscount = useCartStore(s => s.setDiscount);
  const discount = useCartStore(s => s.discount);
  const heldTickets = useCartStore(s => s.heldTickets);
  const holdCurrentTicket = useCartStore(s => s.holdCurrentTicket);
  const recallTicket = useCartStore(s => s.recallTicket);
  const removeHeldTicket = useCartStore(s => s.removeHeldTicket);
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
  const [cashOpen, setCashOpen] = useState<boolean | null>(null); // null = loading
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: number; name: string } | null>(null);
  const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
  const [showHeldTickets, setShowHeldTickets] = useState(false);
  const toast = useToast();
  const saleCompleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { forceFocusToScanner, restoreAfterModal, restoreAfterSaleComplete } = useScannerFocusEngine();
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const focusSearch = useCallback(() => {
    const input = document.querySelector('[data-scan-input]');
    if (input instanceof HTMLElement) input.focus();
  }, []);

  const handleQuickProductSelect = useCallback((p: any) => {
    addItem(p);
    focusSearch();
  }, [addItem, focusSearch]);

  const handleShortcutAction = useCallback((action: string) => {
    switch (action) {
      case 'checkout':
        if (itemsRef.current.length > 0) setPayModalOpen(true);
        break;
      case 'focus-search': focusSearch(); break;
      case 'manual-product': setManualModalOpen(true); break;
      case 'clear-cart':
        if (itemsRef.current.length > 0) {
          clearCart();
          toast('Carrito vaciado', 'info');
          focusSearch();
        }
        break;
      case 'discount': setDiscountOpen(true); break;
      case 'customer': setCustomerModalOpen(true); break;
      case 'hold-ticket': holdCurrentTicket(); toast('Ticket en espera', 'info'); break;
      case 'command-palette': setCmdPaletteOpen(true); break;
      case 'show-shortcuts': setShortcutsOpen(true); break;
      case 'escape': setCmdPaletteOpen(false); setShortcutsOpen(false); setDiscountOpen(false); setCustomerModalOpen(false); break;
    }
  }, [clearCart, focusSearch, toast]);

  useKeyboardShortcuts(handleShortcutAction);

  useEffect(() => {
    const handleManual = () => setManualModalOpen(true);
    const handleCheckout = () => { if (itemsRef.current.length > 0) setPayModalOpen(true); };
    const handleClearCart = () => { if (itemsRef.current.length > 0) { clearCart(); toast('Carrito vaciado', 'info'); focusSearch(); } };
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
  }, [clearCart, focusSearch, toast]);

  useEffect(() => {
    hydrate();
    initSyncManager();
    focusSearch();
  }, [focusSearch, hydrate]);

  // Cash gate: check if cash register is open
  useEffect(() => {
    const checkCash = async () => {
      try {
        const res = await api('/cash/status');
        setCashOpen(!!res.session);
      } catch {
        setCashOpen(false);
      }
    };
    checkCash();
    const onCashUpdate = () => checkCash();
    window.addEventListener('cash-status', onCashUpdate);
    return () => window.removeEventListener('cash-status', onCashUpdate);
  }, []);

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
    restoreAfterSaleComplete();
  }, [restoreAfterSaleComplete]);

  const handleApplyDiscount = useCallback(() => {
    const val = parseFloat(discountValue);
    if (isNaN(val) || val < 0) return;
    const currentItems = itemsRef.current;
    const subtotal = currentItems.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
    if (val > subtotal) {
      toast(`El descuento no puede superar el total de ${formatMoney(subtotal)}`, 'warning');
      return;
    }
    setDiscount(val);
    setDiscountOpen(false);
    setDiscountValue('');
    if (val > 0) toast(`Descuento de ${formatMoney(val)} aplicado`, 'info');
    restoreAfterModal();
  }, [discountValue, setDiscount, toast, restoreAfterModal]);

  const printTicket = useCallback((data: any) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    // Read branding from localStorage
    let branding = { businessName: 'POS Pro', businessSubtitle: 'Punto de Venta', logo: null as string | null };
    try {
      const stored = localStorage.getItem('app_branding');
      if (stored) branding = { ...branding, ...JSON.parse(stored) };
    } catch {}

    const logoHtml = branding.logo
      ? `<img src="${branding.logo}" style="max-height:40px;max-width:180px;margin:0 auto 4px;display:block" />`
      : '';

    const html = `
      <html>
      <head><title>Ticket #${data.id}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; margin: 0 auto; color: #000; }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .line { border-top: 1px dashed #000; margin: 5px 0; }
        .amount { font-family: 'Courier New', monospace; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; }
        .footer-msg { margin-top: 16px; text-align: center; font-size: 11px; }
      </style></head>
      <body>
        <div class="center">
          ${logoHtml}
          <h2 style="margin:0;font-size:15px">${branding.businessName}</h2>
          <p style="margin:2px 0;font-size:10px;color:#555">${branding.businessSubtitle}</p>
          <p style="margin:4px 0">Ticket: #${data.id}<br>${data.date.toLocaleString()}</p>
          <p class="line"></p>
        </div>
        <table>
          ${data.items.map((item: any) => `
            <tr><td colspan="2" class="bold">${item.name}</td></tr>
            <tr><td>${item.quantity} x $${item.price.toFixed(2)}</td><td class="right amount">$${(item.quantity * item.price).toFixed(2)}</td></tr>
          `).join('')}
        </table>
        <p class="line"></p>
        <table>
          <tr><td>Subtotal:</td><td class="right amount">$${data.totals.subtotal.toFixed(2)}</td></tr>
          <tr><td>IVA (16%):</td><td class="right amount">$${data.totals.tax.toFixed(2)}</td></tr>
          ${data.totals.discount > 0 ? `<tr><td>Descuento:</td><td class="right amount">-$${data.totals.discount.toFixed(2)}</td></tr>` : ''}
          <tr class="bold" style="font-size:15px"><td>TOTAL:</td><td class="right amount">$${data.totals.total.toFixed(2)}</td></tr>
        </table>
        <p class="line"></p>
        <table>
          ${data.payments.map((p: any) => `<tr><td>Pago (${p.method}):</td><td class="right amount">$${p.amount.toFixed(2)}</td></tr>`).join('')}
          <tr class="bold"><td>Cambio:</td><td class="right amount">$${data.change.toFixed(2)}</td></tr>
        </table>
        <div class="footer-msg">
          <p class="bold">\u00A1Gracias por su compra!</p>
          <p style="color:#888;margin-top:4px">Conserve este ticket para cualquier aclaraci\u00F3n</p>
        </div>
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

    const currentItems = itemsRef.current;
    const validation = validateStock();
    if (!validation.valid) {
      setPayError(validation.message || 'Stock insuficiente');
      setProcessing(false);
      throw new Error(validation.message || 'Stock invalid');
    }

    try {
      const subtotal = currentItems.reduce((acc, item) => {
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 0;
        return acc + price * qty;
      }, 0);
      const tax = subtotal * 0.16;
      const safeDiscount = Math.max(0, Number(useCartStore.getState().discount) || 0);
      const total = Math.max(0, subtotal + tax - safeDiscount);
      const computedTotals = {
        subtotal: Math.round(subtotal * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        discount: safeDiscount,
        total: Math.round(total * 100) / 100,
      };
      const payments = paymentData.payments || [{ method: paymentData.method, amount: computedTotals.total }];

      const payload = {
        items: currentItems.map(i => ({ product_id: i.id, quantity: i.quantity, unit_price: i.price })),
        discount: computedTotals.discount,
        payment_method: paymentData.method,
        payments,
        customer_id: selectedCustomer?.id || null,
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
          items: currentItems.map((i: any) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
          total: computedTotals.total,
          tax: computedTotals.tax,
          discount: computedTotals.discount,
          payment_method: paymentData.method,
          created_at: new Date(),
          idempotency_key: idempotencyKey,
        }, idempotencyKey);
        offlineMode = true;
      }

      printTicket({ items: currentItems, totals: computedTotals, payments, change: paymentData.change || 0, date: new Date(), id: ticketId });
      clearCart();
      setSelectedCustomer(null);
      showSaleComplete(computedTotals.total, paymentData.change || 0, paymentData.method);
      if (offlineMode) toast('Venta guardada localmente hasta que haya internet', 'info');
      restoreAfterSaleComplete();
    } catch (e) {
      const msg = 'Error al procesar la venta: ' + (e instanceof Error ? e.message : '');
      setPayError(msg);
      toast(msg, 'error');
      throw e;
    } finally {
      setProcessing(false);
    }
  }, [validateStock, generateCheckoutId, printTicket, clearCart, toast, showSaleComplete, restoreAfterSaleComplete, selectedCustomer]);

  const handleAddManual = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.name || !manualForm.price) return;

    addItem({
      id: crypto.randomUUID?.() || 'manual-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      name: manualForm.name || 'Producto',
      price: parseFloat(manualForm.price || '0'),
      quantity: 1,
      stock: 999999,
      isManual: true,
    } as any);

    setManualForm({ name: '', price: '' });
    setManualModalOpen(false);
    toast(`"${manualForm.name}" agregado`, 'success');
    restoreAfterModal();
  }, [manualForm, addItem, toast, restoreAfterModal]);

  const openPayModal = useCallback(() => {
    const validation = validateStock();
    if (!validation.valid) {
      setPayError(validation.message ?? 'Stock insuficiente');
      toast(validation.message ?? 'Stock insuficiente', 'warning');
      return;
    }
    setPayError('');
    setPayModalOpen(true);
  }, [validateStock, toast]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 0;
      return acc + price * qty;
    }, 0);
    const tax = subtotal * 0.16;
    const safeDiscount = Math.max(0, Number(discount) || 0);
    const total = Math.max(0, subtotal + tax - safeDiscount);
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      discount: safeDiscount,
      total: Math.round(total * 100) / 100,
    };
  }, [items, discount]);
  const hasItems = items.length > 0;

  return (
    <div className="h-full min-h-0 flex gap-2.5 overflow-hidden">
      {/* Catalog panel — 60% on kiosk landscape */}
      <div className="flex-1 min-w-0 flex flex-col gap-2.5" style={{ flexBasis: 'var(--pos-catalog-width, 60%)' }}>
        <div className="flex gap-2">
          <div className="flex-1">
            <ProductSearch />
          </div>
          <button
            onClick={() => setManualModalOpen(true)}
            className="shrink-0 min-h-[var(--control-xl)] px-3 text-xs font-bold rounded-lg bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20 transition-colors flex items-center gap-1 touch-target"
            title="Producto manual (F4)"
            aria-label="Agregar producto manual"
          >
            <Zap className="size-4" />
            <span className="hidden lg:inline">Manual</span>
          </button>
        </div>

        <div className="flex-1 rounded-lg border border-border/20 bg-card p-2 overflow-y-auto">
          <QuickProducts onSelect={handleQuickProductSelect} />
        </div>
      </div>

      {/* Cart panel — 40% on kiosk landscape, fixed right */}
      <div className="flex flex-col rounded-lg border border-border/20 bg-card h-full overflow-hidden pos-cart-panel" style={{ flexBasis: 'var(--pos-cart-width, 40%)', minWidth: '280px', maxWidth: '480px' }}>
        <div className="px-3 py-2 border-b border-border/20 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-xs flex items-center gap-1.5" id="cart-heading">
            <ShoppingBag className="size-3.5" />
            Carrito
            <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center" aria-live="polite">
              {items.length}
            </span>
          </h2>
          <div className="flex items-center gap-1">
            {heldTickets.length > 0 && (
              <button
                onClick={() => setShowHeldTickets(!showHeldTickets)}
                className="text-[10px] font-semibold text-pos-hold hover:bg-pos-hold/10 px-2 py-1.5 rounded-md transition-colors flex items-center gap-0.5 touch-target relative"
                title={`Tickets en espera (${heldTickets.length})`}
              >
                <Clock className="size-3" />
                <span>{heldTickets.length}</span>
              </button>
            )}
            <button
              onClick={() => { if (items.length > 0) { holdCurrentTicket(); toast('Ticket en espera', 'info'); } }}
              disabled={!hasItems}
              className="text-[10px] font-semibold text-info hover:bg-info/10 px-2 py-1.5 rounded-md transition-colors disabled:opacity-30 flex items-center gap-0.5 touch-target"
              title="Pausar ticket (Ctrl+H)"
            >
              <Pause className="size-3" />Pausar
            </button>
            <button
              onClick={() => setDiscountOpen(true)}
              disabled={!hasItems}
              className="text-[10px] font-semibold text-info hover:bg-info/10 px-2 py-1.5 rounded-md transition-colors disabled:opacity-30 flex items-center gap-0.5 touch-target"
              title="Descuento (F5)"
            >
              <Percent className="size-3" />Dto
            </button>
            <button
              onClick={() => { clearCart(); toast('Carrito vaciado', 'info'); focusSearch(); }}
              disabled={!hasItems}
              className="text-[10px] font-semibold text-danger hover:bg-danger/10 px-2 py-1.5 rounded-md transition-colors disabled:opacity-30 touch-target"
              aria-label="Vaciar carrito"
            >
              Vaciar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-1" role="region" aria-labelledby="cart-heading" aria-live="polite">
          {showHeldTickets && heldTickets.length > 0 && (
            <div className="mb-2 border border-pos-hold/30 rounded-lg bg-pos-hold/5 overflow-hidden">
              <div className="px-3 py-2 border-b border-pos-hold/20 flex items-center justify-between">
                <span className="text-[10px] font-bold text-pos-hold uppercase tracking-wider">Tickets en espera</span>
                <button onClick={() => setShowHeldTickets(false)} className="text-pos-hold/60 hover:text-foreground"><X className="size-3" /></button>
              </div>
              {heldTickets.map(t => (
                <div key={t.id} className="px-3 py-2 flex items-center justify-between border-b border-pos-hold/10 last:border-0">
                  <button
                    onClick={() => { recallTicket(t.id); setShowHeldTickets(false); toast(`Ticket restaurado: ${t.label}`, 'success'); }}
                    className="flex-1 text-left min-w-0"
                  >
                    <p className="text-xs font-semibold text-foreground truncate">{t.label}</p>
                    <p className="text-[10px] text-muted-foreground">{t.items.length} items · {new Date(t.heldAt).toLocaleTimeString()}</p>
                  </button>
                  <button
                    onClick={() => { removeHeldTicket(t.id); toast('Ticket descartado', 'info'); }}
                    className="text-danger/60 hover:text-danger ml-2 shrink-0 touch-target"
                    aria-label="Descartar ticket"
                  >
                    <XCircle className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Cart />
        </div>

        {discount > 0 && (
          <div className="px-3 py-1.5 bg-info/10 border-t border-info/20 flex items-center justify-between text-xs">
            <span className="font-semibold text-info">Descuento</span>
            <span className="font-bold text-info tabular-nums">-{formatMoney(discount)}</span>
          </div>
        )}

        {payError && (
          <div className="px-3 py-2 bg-danger/10 border-t-2 border-danger/20 flex items-center gap-1.5" role="alert">
            <span className="text-xs font-semibold text-danger">{payError}</span>
          </div>
        )}

        <div className="px-3 py-2 border-t border-border/20 space-y-2 shrink-0 pb-[env(safe-area-inset-bottom,0.75rem)]">
          {/* Customer selector */}
          <div className="flex items-center gap-2">
            {selectedCustomer ? (
              <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-info/10 border border-info/20 text-xs">
                <UserPlus className="size-3.5 text-info shrink-0" />
                <span className="font-semibold text-info truncate flex-1">{selectedCustomer.name}</span>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-info/60 hover:text-danger transition-colors shrink-0"
                  aria-label="Quitar cliente"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCustomerModalOpen(true)}
                className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-dashed border-border/40 text-xs text-muted-foreground hover:border-info/40 hover:text-info transition-colors"
              >
                <UserPlus className="size-3.5" />
                <span>Agregar cliente (F6)</span>
              </button>
            )}
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground font-medium">Total:</span>
            <span className="text-3xl font-black text-foreground tracking-tight font-mono tabular-nums">
              {formatMoney(totals.total)}
            </span>
          </div>

          {!hasItems && (
            <p className="text-xs text-muted-foreground/60 text-center font-medium">
              Escanee o busque productos para comenzar
            </p>
          )}

          <CheckoutButton hasItems={hasItems} isProcessing={isProcessing} totals={totals} onCheckout={openPayModal} />
        </div>
      </div>

      {saleComplete && (
        <div
          className="fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center bg-black/40"
          onClick={dismissSaleComplete}
          role="alert"
          aria-live="assertive"
        >
          <div className="bg-card rounded-lg border border-success/30 shadow-2xl px-6 py-5 text-center max-w-xs">
            <div className="size-12 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-2">
              <Check className="size-6 text-success" />
            </div>
            <p className="text-base font-black text-foreground mb-0.5">VENTA COMPLETADA</p>
            <p className="text-2xl font-black text-pos-checkout font-mono tabular-nums mb-1">{formatMoney(saleComplete.total)}</p>
            {saleComplete.change > 0 && (
              <p className="text-sm font-semibold text-muted-foreground">
                Cambio: <span className="text-foreground tabular-nums">{formatMoney(saleComplete.change)}</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground/60 mt-1 font-medium">
              {saleComplete.method === 'cash' ? 'Efectivo' : saleComplete.method === 'card' ? 'Tarjeta' : saleComplete.method === 'transfer' ? 'Transferencia' : 'Mixto'}
            </p>
            <p className="text-[10px] text-muted-foreground/40 mt-3 font-medium">
              Toque en cualquier parte para continuar
            </p>
          </div>
        </div>
      )}

      <Modal
        open={isManualModalOpen}
        onClose={() => { setManualModalOpen(false); restoreAfterModal(); }}
        title="Producto Manual"
        size="sm"
        onRestoreFocus={restoreAfterModal}
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

      <Modal
        open={isDiscountOpen}
        onClose={() => { setDiscountOpen(false); restoreAfterModal(); }}
        title="Descuento"
        size="sm"
        onRestoreFocus={restoreAfterModal}
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
            <Button variant="secondary" className="flex-1 text-xs" onClick={() => { setDiscountOpen(false); restoreAfterModal(); }}>
              Cancelar
            </Button>
            <Button className="flex-1 text-xs" onClick={handleApplyDiscount} disabled={!discountValue || parseFloat(discountValue) <= 0}>
              Aplicar
            </Button>
          </div>
          {discount > 0 && (
            <button
              onClick={() => { setDiscount(0); setDiscountOpen(false); toast('Descuento eliminado', 'info'); restoreAfterModal(); }}
              className="w-full text-xs font-semibold text-danger hover:bg-danger/10 py-2 rounded-md transition-colors touch-target"
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
          onClose={() => { setPayModalOpen(false); setPayError(''); restoreAfterModal(); }}
          onConfirm={handleCheckout}
          isLoading={isProcessing}
        />
      )}

      <CommandPalette open={isCmdPaletteOpen} onClose={() => { setCmdPaletteOpen(false); restoreAfterModal(); }} />
      <ShortcutsOverlay open={isShortcutsOpen} onClose={() => { setShortcutsOpen(false); restoreAfterModal(); }} />

      {/* Customer Search Modal */}
      <CustomerSearchModal
        open={isCustomerModalOpen}
        onClose={() => { setCustomerModalOpen(false); restoreAfterModal(); }}
        onSelect={(c) => { setSelectedCustomer(c); setCustomerModalOpen(false); toast(`Cliente: ${c.name}`, 'info'); restoreAfterModal(); }}
      />

      {/* Cash Gate: block sales when cash register is closed */}
      {cashOpen === false && (
        <div className="fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card rounded-xl border border-border p-8 text-center max-w-sm shadow-2xl">
            <div className="size-14 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="size-7 text-danger" />
            </div>
            <h3 className="text-lg font-black text-foreground mb-2">Caja Cerrada</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Debes abrir caja antes de realizar ventas. Ve a la secci&oacute;n de Caja para aperturar.
            </p>
            <a
              href="#/caja"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              <Wallet className="size-4" />
              Abrir Caja
            </a>
          </div>
        </div>
      )}
    </div>
  );
});

export default SalesView;
