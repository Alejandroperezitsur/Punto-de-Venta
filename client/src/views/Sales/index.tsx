import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ProductSearch } from '../../components/sales/ProductSearch';
import { Cart } from '../../components/sales/Cart';
import { PaymentModal } from '../../components/sales/PaymentModal';
import { QuickProducts } from '../../components/sales/QuickProducts';
import { CustomerSearchModal, useCustomerSelector, CustomerBadge } from '../../components/sales/CustomerSelector';
import { SaleCompleteOverlay } from '../../components/sales/SaleCompleteOverlay';
import { useCartStore } from '../../store/cartStore';
import { useUserStore } from '../../store/userStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { CommandCenter, ShortcutsOverlay, useKeyboardShortcuts } from '../../components/common/CommandPalette';
import { useScannerFocusEngine } from '../../hooks/useScannerFocusEngine';
import { api } from '../../lib/api';
import { enqueueSale, initSyncManager } from '../../lib/syncManager';
import {
  Plus, Zap, ShoppingBag, Percent, XCircle, Check,
  Lock, Wallet, UserPlus, X, Pause, Clock, Trash2,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatMoney } from '../../utils/format';
import { useNavigate } from 'react-router-dom';

const SalesView = React.memo(function SalesView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
  const [cashOpen, setCashOpen] = useState<boolean | null>(null);
  const [showHeldTickets, setShowHeldTickets] = useState(false);

  const { selectedCustomer, isModalOpen: isCustomerModalOpen, setModalOpen: setCustomerModalOpen, selectCustomer, clearCustomer } = useCustomerSelector();

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
      case 'checkout': if (itemsRef.current.length > 0) setPayModalOpen(true); break;
      case 'focus-search': focusSearch(); break;
      case 'manual-product': setManualModalOpen(true); break;
      case 'clear-cart': if (itemsRef.current.length > 0) { clearCart(); toast(t('sales.cartCleared'), 'info'); focusSearch(); } break;
      case 'discount': setDiscountOpen(true); break;
      case 'customer': setCustomerModalOpen(true); break;
      case 'hold-ticket': holdCurrentTicket(); toast(t('sales.ticketHeld'), 'info'); break;
      case 'command-palette': setCmdPaletteOpen(true); break;
      case 'show-shortcuts': setShortcutsOpen(true); break;
      case 'escape': setCmdPaletteOpen(false); setShortcutsOpen(false); setDiscountOpen(false); setCustomerModalOpen(false); break;
    }
  }, [clearCart, focusSearch, toast, t]);

  useKeyboardShortcuts(handleShortcutAction);

  useEffect(() => {
    const handleManual = () => setManualModalOpen(true);
    const handleCheckout = () => { if (itemsRef.current.length > 0) setPayModalOpen(true); };
    const handleClearCart = () => { if (itemsRef.current.length > 0) { clearCart(); toast(t('sales.cartCleared'), 'info'); focusSearch(); } };
    const handleShortcuts = () => setShortcutsOpen(true);
    const handleLogout = () => { useUserStore.getState().logout(); navigate('/login'); };
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
  }, [clearCart, focusSearch, toast, navigate, t]);

  useEffect(() => {
    hydrate();
    initSyncManager();
    focusSearch();
  }, []);

  useEffect(() => {
    const checkCash = async () => {
      try {
        const res = await api('/cash/status');
        setCashOpen(!!res.session);
      } catch { setCashOpen(false); }
    };
    checkCash();
    const onCashUpdate = () => checkCash();
    window.addEventListener('cash-status', onCashUpdate);
    return () => window.removeEventListener('cash-status', onCashUpdate);
  }, []);

  useEffect(() => {
    return () => { if (saleCompleteTimer.current) clearTimeout(saleCompleteTimer.current); };
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
    if (val > subtotal) { toast(t('sales.discountExceedsSubtotal', { amount: formatMoney(subtotal) }), 'warning'); return; }
    setDiscount(val);
    setDiscountOpen(false);
    setDiscountValue('');
    if (val > 0) toast(t('sales.discountApplied', { amount: formatMoney(val) }), 'info');
    restoreAfterModal();
  }, [discountValue, setDiscount, toast, restoreAfterModal, t]);

  const printTicket = useCallback((data: any) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:absolute;width:0;height:0;border:none';
    document.body.appendChild(iframe);
    let branding = { businessName: 'POS Pro', businessSubtitle: 'Punto de Venta', logo: null as string | null };
    try { const stored = localStorage.getItem('app_branding'); if (stored) branding = { ...branding, ...JSON.parse(stored) }; } catch {}
    const logoHtml = branding.logo ? `<img src="${branding.logo}" style="max-height:40px;max-width:180px;margin:0 auto 4px;display:block" />` : '';
    const html = `<html><head><title>Ticket #${data.id}</title><style>body{font-family:'Courier New',monospace;font-size:12px;width:280px;margin:0 auto;color:#000}.center{text-align:center}.right{text-align:right}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:5px 0}.amount{font-weight:bold}table{width:100%;border-collapse:collapse}td{vertical-align:top}</style></head><body><div class="center">${logoHtml}<h2 style="margin:0;font-size:15px">${branding.businessName}</h2><p style="margin:2px 0;font-size:10px;color:#555">${branding.businessSubtitle}</p><p style="margin:4px 0">#${data.id}<br>${data.date.toLocaleString()}</p><p class="line"></p></div><table>${data.items.map((item: any) => `<tr><td colspan="2" class="bold">${item.name}</td></tr><tr><td>${item.quantity} x $${item.price.toFixed(2)}</td><td class="right amount">$${(item.quantity * item.price).toFixed(2)}</td></tr>`).join('')}</table><p class="line"></p><table><tr><td>${t('sales.printSubtotal')}</td><td class="right amount">$${data.totals.subtotal.toFixed(2)}</td></tr><tr><td>${t('sales.printTax')}</td><td class="right amount">$${data.totals.tax.toFixed(2)}</td></tr>${data.totals.discount > 0 ? `<tr><td>${t('sales.printDiscount')}</td><td class="right amount">-$${data.totals.discount.toFixed(2)}</td></tr>` : ''}<tr class="bold" style="font-size:15px"><td>${t('sales.printTotal')}</td><td class="right amount">$${data.totals.total.toFixed(2)}</td></tr></table><p class="line"></p><table>${data.payments.map((p: any) => `<tr><td>${t('sales.printPayment')} (${p.method}):</td><td class="right amount">$${p.amount.toFixed(2)}</td></tr>`).join('')}<tr class="bold"><td>${t('sales.printChange')}</td><td class="right amount">$${data.change.toFixed(2)}</td></tr></table><div style="margin-top:16px;text-align:center;font-size:11px"><p class="bold">${t('sales.printThankYou')}</p></div><script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)}<\/script></body></html>`;
    iframe.contentWindow?.document.open();
    iframe.contentWindow?.document.write(html);
    iframe.contentWindow?.document.close();
    setTimeout(() => document.body.removeChild(iframe), 3000);
  }, [t]);

  const handleCheckout = useCallback(async (paymentData: any) => {
    setProcessing(true);
    setPayError('');
    const currentItems = itemsRef.current;
    const validation = validateStock();
    if (!validation.valid) { setPayError(validation.message || t('sales.insufficientStock')); setProcessing(false); throw new Error(validation.message || 'Stock invalid'); }
    try {
      const subtotal = currentItems.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
      const tax = subtotal * 0.16;
      const safeDiscount = Math.max(0, Number(useCartStore.getState().discount) || 0);
      const total = Math.max(0, subtotal + tax - safeDiscount);
      const computedTotals = { subtotal: Math.round(subtotal * 100) / 100, tax: Math.round(tax * 100) / 100, discount: safeDiscount, total: Math.round(total * 100) / 100 };
      const payments = paymentData.payments || [{ method: paymentData.method, amount: computedTotals.total }];
      const payload = { items: currentItems.map(i => ({ product_id: i.id, quantity: i.quantity, unit_price: i.price })), discount: computedTotals.discount, payment_method: paymentData.method, payments, customer_id: selectedCustomer?.id || null };
      const idempotencyKey = generateCheckoutId();
      let ticketId = idempotencyKey;
      let offlineMode = false;
      try {
        if (!navigator.onLine) throw new Error('offline');
        const res = await api('/sales', { method: 'POST', body: JSON.stringify(payload), headers: { 'X-Idempotency-Key': idempotencyKey } });
        ticketId = res.id || idempotencyKey;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        const shouldQueueOffline = !navigator.onLine || /offline|failed to fetch|network error/i.test(message);
        if (!shouldQueueOffline) { const msg = t('sales.saleError') + ' ' + message; setPayError(msg); toast(msg, 'error'); throw e; }
        await enqueueSale({ items: currentItems.map((i: any) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })), total: computedTotals.total, tax: computedTotals.tax, discount: computedTotals.discount, payment_method: paymentData.method, created_at: new Date(), idempotency_key: idempotencyKey });
        offlineMode = true;
      }
      printTicket({ items: currentItems, totals: computedTotals, payments, change: paymentData.change || 0, date: new Date(), id: ticketId });
      clearCart();
      clearCustomer();
      showSaleComplete(computedTotals.total, paymentData.change || 0, paymentData.method);
      if (offlineMode) toast(t('sales.saleSavedOffline'), 'info');
      restoreAfterSaleComplete();
    } catch (e) {
      const msg = t('sales.saleError') + ' ' + (e instanceof Error ? e.message : '');
      setPayError(msg);
      toast(msg, 'error');
      throw e;
    } finally { setProcessing(false); }
  }, [validateStock, generateCheckoutId, printTicket, clearCart, toast, showSaleComplete, restoreAfterSaleComplete, selectedCustomer, clearCustomer, t]);

  const handleAddManual = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.name || !manualForm.price) return;
    addItem({ id: crypto.randomUUID?.() || 'manual-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), name: manualForm.name || t('sales.product'), price: parseFloat(manualForm.price || '0'), quantity: 1, stock: 999999, isManual: true } as any);
    setManualForm({ name: '', price: '' });
    setManualModalOpen(false);
    toast(`"${manualForm.name}" ${t('sales.productAdded')}`, 'success');
    restoreAfterModal();
  }, [manualForm, addItem, toast, restoreAfterModal, t]);

  const openPayModal = useCallback(() => {
    const validation = validateStock();
    if (!validation.valid) { setPayError(validation.message ?? t('sales.insufficientStock')); toast(validation.message ?? t('sales.insufficientStock'), 'warning'); return; }
    setPayError('');
    setPayModalOpen(true);
  }, [validateStock, toast, t]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
    const tax = subtotal * 0.16;
    const safeDiscount = Math.max(0, Number(discount) || 0);
    const total = Math.max(0, subtotal + tax - safeDiscount);
    return { subtotal: Math.round(subtotal * 100) / 100, tax: Math.round(tax * 100) / 100, discount: safeDiscount, total: Math.round(total * 100) / 100 };
  }, [items, discount]);

  const hasItems = items.length > 0;

  return (
    <div className="h-full flex gap-0 overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col" style={{ flexBasis: '55%' }}>
        <div className="flex gap-2 p-3 pb-2 shrink-0">
          <div className="flex-1"><ProductSearch /></div>
          <button
            onClick={() => setManualModalOpen(true)}
            className="shrink-0 h-12 px-4 text-sm font-medium rounded-lg bg-bg-surface text-text-secondary border border-border-subtle hover:border-border-default hover:text-text-primary press-effect transition-all flex items-center gap-2"
            title={t('sales.manualProductHint')}
          >
            <Zap className="size-4" />
            <span className="hidden lg:inline">{t('shortcuts.manual')}</span>
          </button>
        </div>

        <div className="flex-1 rounded-lg bg-bg-surface border border-border-subtle overflow-y-auto mx-3 mb-3 p-3 lg:p-4">
          <QuickProducts onSelect={handleQuickProductSelect} />
        </div>
      </div>

      <div className="flex flex-col rounded-l-lg bg-bg-surface border border-border-subtle" style={{ flexBasis: '45%', maxWidth: '480px' }}>
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-sm flex items-center gap-2.5" id="cart-heading">
            <ShoppingBag className="size-4 text-text-secondary" />
            <span>{t('sales.cart')}</span>
            <span className="bg-bg-inset text-text-secondary text-xs font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center tabular-nums" aria-live="polite">
              {items.length}
            </span>
          </h2>

          <div className="flex items-center gap-0.5">
            {heldTickets.length > 0 && (
              <button onClick={() => setShowHeldTickets(!showHeldTickets)} className="size-8 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover transition-colors flex items-center justify-center" aria-label={`${t('sales.holdTickets')} (${heldTickets.length})`}>
                <Clock className="size-4" />
              </button>
            )}
            <button onClick={() => { if (hasItems) { holdCurrentTicket(); toast(t('sales.ticketPaused'), 'info'); } }} disabled={!hasItems} className="size-8 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover transition-colors disabled:opacity-30 flex items-center justify-center" aria-label={t('sales.holdTicket')}>
              <Pause className="size-4" />
            </button>
            <button onClick={() => setDiscountOpen(true)} disabled={!hasItems} className="size-8 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover transition-colors disabled:opacity-30 flex items-center justify-center" aria-label={t('sales.discount')}>
              <Percent className="size-4" />
            </button>
            <button onClick={() => setCustomerModalOpen(true)} className="size-8 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover transition-colors flex items-center justify-center" aria-label={t('sales.addCustomerShort')}>
              <UserPlus className="size-4" />
            </button>
            <div className="w-px h-4 bg-border-subtle mx-0.5" />
            <button onClick={() => { if (hasItems) { clearCart(); toast(t('sales.cartCleared'), 'info'); focusSearch(); } }} disabled={!hasItems} className="size-8 rounded-md text-text-tertiary hover:text-danger hover:bg-danger-bg transition-colors disabled:opacity-30 flex items-center justify-center" aria-label={t('sales.clearCart')}>
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2" role="region" aria-labelledby="cart-heading">
          {showHeldTickets && heldTickets.length > 0 && (
            <div className="mb-2 border border-border-subtle rounded-lg bg-bg-surface overflow-hidden">
              <div className="px-3 py-2 border-b border-border-subtle flex items-center justify-between">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">{t('sales.onHold')}</span>
                <button onClick={() => setShowHeldTickets(false)} className="text-text-tertiary hover:text-text-primary" aria-label={t('common.close')}><X className="size-3" /></button>
              </div>
              {heldTickets.map(t => (
                <div key={t.id} className="px-3 py-2.5 flex items-center justify-between border-b border-border-subtle last:border-0">
                  <button onClick={() => { recallTicket(t.id); setShowHeldTickets(false); toast(`${t('sales.ticketRestored')} ${t.label}`, 'success'); }} className="flex-1 text-left min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">{t.label}</p>
                    <p className="text-[10px] text-text-tertiary">{t.items.length} items · {new Date(t.heldAt).toLocaleTimeString()}</p>
                  </button>
                  <button onClick={() => { removeHeldTicket(t.id); toast(t('sales.ticketDiscarded'), 'info'); }} className="text-danger/50 hover:text-danger ml-2 shrink-0" aria-label={t('sales.discardTicket')}>
                    <XCircle className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Cart />
        </div>

        {discount > 0 && (
          <div className="px-4 py-2 bg-accent-bg border-t border-accent/15 flex items-center justify-between text-sm">
            <span className="font-semibold text-accent-text flex items-center gap-1.5"><Percent className="size-3" />{t('sales.discount')}</span>
            <span className="font-bold text-accent-text tabular-nums">-{formatMoney(discount)}</span>
          </div>
        )}

        {payError && (
          <div className="px-3 py-2 bg-danger-bg border-t border-danger/20 flex items-center gap-1.5" role="alert">
            <span className="text-sm font-medium text-danger-text">{payError}</span>
          </div>
        )}

        <div className="px-4 py-3 border-t border-border-subtle space-y-3 shrink-0">
          <div className="flex items-center gap-2">
            {selectedCustomer ? (
              <CustomerBadge customer={selectedCustomer} onRemove={clearCustomer} />
            ) : (
              <button onClick={() => setCustomerModalOpen(true)} className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border-default text-sm text-text-tertiary hover:border-accent/40 hover:text-accent-text transition-all">
                <UserPlus className="size-4" />
                <span>{t('sales.addCustomer')}</span>
              </button>
            )}
          </div>

          <div className="rounded-lg bg-bg-surface border border-border-subtle">
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary font-medium">{t('sales.subtotal')}</span>
                <span className="font-semibold text-text-primary tabular-nums">{formatMoney(totals.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary font-medium">{t('sales.vat')}</span>
                <span className="font-semibold text-text-primary tabular-nums">{formatMoney(totals.tax)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-accent-text font-medium">{t('sales.discount')}</span>
                  <span className="font-semibold text-accent-text tabular-nums">-{formatMoney(totals.discount)}</span>
                </div>
              )}
            </div>
            <div className="px-4 pb-4 pt-2.5 border-t border-border-subtle flex items-baseline justify-between">
              <span className="text-xs font-bold text-text-tertiary uppercase tracking-widest">{t('sales.total')}</span>
              <span className="text-[var(--text-display)] font-bold text-text-primary tracking-tight tabular-nums leading-none">
                {formatMoney(totals.total)}
              </span>
            </div>
          </div>

          {!hasItems && (
            <p className="text-sm text-text-tertiary text-center font-medium">{t('sales.scanPrompt')}</p>
          )}

          <button
            className={cn(
              'w-full h-[var(--control-xl)] text-base font-semibold rounded-lg transition-all duration-150 flex items-center justify-center gap-3 press-effect',
              hasItems && !isProcessing
                ? 'bg-action-primary text-[var(--bg-surface)] hover:bg-action-primary-hover'
                : 'bg-bg-inset text-text-disabled cursor-not-allowed',
            )}
            disabled={!hasItems || isProcessing}
            onClick={openPayModal}
            aria-label={hasItems ? t('sales.charge') : t('sales.addProductsFirst')}
          >
            {isProcessing ? (
              <><span className="size-2.5 rounded-full bg-current animate-pulse" /><span>{t('sales.processing')}</span></>
            ) : (
              <><Wallet className="size-5" /><span>{t('sales.checkout')} {formatMoney(totals.total)}</span></>
            )}
          </button>
        </div>
      </div>

      {saleComplete && <SaleCompleteOverlay {...saleComplete} onDismiss={dismissSaleComplete} />}

      <Modal open={isManualModalOpen} onClose={() => { setManualModalOpen(false); restoreAfterModal(); }} title={t('sales.manualProduct')} size="sm">
        <form onSubmit={handleAddManual} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">{t('sales.name')}</label>
            <Input placeholder={t('sales.name') + '...'} value={manualForm.name} onChange={e => setManualForm({ ...manualForm, name: e.target.value })} autoFocus required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">{t('sales.price')}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-text-tertiary text-sm">$</span>
              <Input className="pl-7" type="number" step="0.01" min="0" placeholder="0.00" value={manualForm.price} onChange={e => setManualForm({ ...manualForm, price: e.target.value })} required />
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full">{t('sales.addToCart')}</Button>
        </form>
      </Modal>

      <Modal open={isDiscountOpen} onClose={() => { setDiscountOpen(false); restoreAfterModal(); }} title={t('sales.discount')} size="sm">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">{t('sales.discountAmount')}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-text-tertiary text-sm">$</span>
              <Input className="pl-7" type="number" step="0.01" min="0" placeholder="0.00" value={discountValue} onChange={e => setDiscountValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleApplyDiscount(); }} autoFocus />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setDiscountOpen(false); restoreAfterModal(); }}>{t('common.cancel')}</Button>
            <Button className="flex-1" onClick={handleApplyDiscount} disabled={!discountValue || parseFloat(discountValue) <= 0}>{t('sales.apply')}</Button>
          </div>
          {discount > 0 && (
            <button onClick={() => { setDiscount(0); setDiscountOpen(false); toast(t('sales.discountRemoved'), 'info'); restoreAfterModal(); }} className="w-full text-xs font-semibold text-danger hover:bg-danger-bg py-2.5 rounded-lg transition-colors">
              {t('sales.removeDiscount')} ({formatMoney(discount)})
            </button>
          )}
        </div>
      </Modal>

      {isPayModalOpen && (
        <PaymentModal total={totals.total} items={items} onClose={() => { setPayModalOpen(false); setPayError(''); restoreAfterModal(); }} onConfirm={handleCheckout} isLoading={isProcessing} />
      )}

      <CommandCenter open={isCmdPaletteOpen} onClose={() => { setCmdPaletteOpen(false); restoreAfterModal(); }} />
      <ShortcutsOverlay open={isShortcutsOpen} onClose={() => { setShortcutsOpen(false); restoreAfterModal(); }} />

      <CustomerSearchModal open={isCustomerModalOpen} onClose={() => { setCustomerModalOpen(false); restoreAfterModal(); }} onSelect={selectCustomer} />

      {cashOpen === false && (
        <div className="fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center bg-black/40">
          <div className="bg-bg-surface rounded-xl shadow-dialog p-8 text-center max-w-sm animate-scale-in">
            <div className="size-14 rounded-xl bg-danger-bg flex items-center justify-center mx-auto mb-4">
              <Lock className="size-7 text-danger" />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">{t('sales.cashClosed')}</h3>
            <p className="text-sm text-text-secondary mb-6">{t('sales.openCashFirst')}</p>
            <button onClick={() => navigate('/caja')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-action-primary text-[var(--bg-surface)] font-semibold text-sm hover:bg-action-primary-hover transition-colors">
              <Wallet className="size-4" /> {t('sales.openCash')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default SalesView;
