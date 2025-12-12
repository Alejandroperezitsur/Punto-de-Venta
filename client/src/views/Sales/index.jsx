import React, { useState } from 'react';
import { ProductSearch } from '../../components/sales/ProductSearch';
import { Cart } from '../../components/sales/Cart';
import { PaymentModal } from '../../components/sales/PaymentModal';
import { useCartStore } from '../../store/useCartStore';
import { Button } from '../../components/common/Button';
import { api } from '../../lib/api';

const SalesView = () => {
    const { items, getTotals, clearCart } = useCartStore();
    const [isPayModalOpen, setPayModalOpen] = useState(false);
    const [isProcessing, setProcessing] = useState(false);

    const handleCheckout = async (paymentData) => {
        setProcessing(true);
        try {
            const { total, discount, subtotal, tax } = getTotals();

            // Prepare payments array
            const payments = paymentData.payments || [{ method: paymentData.method, amount: total }];

            const payload = {
                items: items.map(i => ({ product_id: i.id, quantity: i.quantity, unit_price: i.price })),
                discount,
                payment_method: paymentData.method, // 'mixed' or specific
                payments
            };

            const res = await api('/sales', { method: 'POST', body: JSON.stringify(payload) });

            // Success
            // Print Ticket
            printTicket({
                items,
                totals: { total, discount, subtotal, tax },
                payments,
                change: paymentData.change || 0,
                date: new Date(),
                id: res.id
            });

            clearCart();
            setPayModalOpen(false);
            // alert('Venta completada con éxito'); // Ticket should be enough feedback
        } catch (e) {
            alert('Error al procesar la venta: ' + e.message);
        } finally {
            setProcessing(false);
        }
    };

    const printTicket = (data) => {
        const win = window.open('', '', 'width=300,height=600');
        if (!win) return;

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
                    <p>Sucursal Principal<br>San Felipe, Gto.<br>RFC: XAXX010101000</p>
                    <p class="line"></p>
                    <p>
                        Ticket: #${data.id}<br>
                        Fecha: ${data.date.toLocaleString()}
                    </p>
                    <p class="line"></p>
                </div>

                <table>
                    ${data.items.map(item => `
                        <tr>
                            <td colspan="2">${item.name}</td>
                        </tr>
                        <tr>
                            <td>${item.quantity} x $${item.price.toFixed(2)}</td>
                            <td class="right">$${(item.quantity * item.price).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </table>

                <p class="line"></p>
                
                <table>
                    <tr>
                        <td>Subtotal:</td>
                        <td class="right">$${data.totals.subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>IVA:</td>
                        <td class="right">$${data.totals.tax.toFixed(2)}</td>
                    </tr>
                    ${data.totals.discount > 0 ? `
                    <tr>
                        <td>Descuento:</td>
                        <td class="right">-$${data.totals.discount.toFixed(2)}</td>
                    </tr>` : ''}
                    <tr class="bold" style="font-size: 14px">
                        <td>TOTAL:</td>
                        <td class="right">$${data.totals.total.toFixed(2)}</td>
                    </tr>
                </table>

                <p class="line"></p>

                <table>
                    ${data.payments.map(p => `
                        <tr>
                            <td>Pago (${p.method}):</td>
                            <td class="right">$${p.amount.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                    <tr class="bold">
                        <td>Cambio:</td>
                        <td class="right">$${data.change.toFixed(2)}</td>
                    </tr>
                </table>

                <div class="center" style="margin-top: 20px">
                    <p>¡Gracias por su compra!</p>
                    <p>v2.0 Powered by DeepMind</p>
                </div>

                <script>
                    window.onload = function() { window.print(); setTimeout(() => window.close(), 100); }
                </script>
            </body>
            </html>
        `;

        win.document.write(html);
        win.document.close();
    };

    return (
        <div className="h-[calc(100vh-100px)] flex gap-6">
            {/* Left Column: Products & Search (Could be grid of products later) */}
            <div className="flex-1 flex flex-col">
                <h1 className="text-2xl font-bold mb-6">Nueva Venta</h1>
                <ProductSearch />

                {/* Placeholder for Product Grid if we implement it, usually users want quick access buttons */}
                <div className="flex-1 bg-[var(--bg-muted)] rounded-xl border border-dashed border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)]">
                    <p>Grilla de productos rápidos (Próximamente)</p>
                </div>
            </div>

            {/* Right Column: Cart */}
            <div className="w-[400px] flex flex-col bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm h-full overflow-hidden">
                <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-muted)]">
                    <h2 className="font-semibold flex items-center gap-2">
                        Carrito de Compra
                        <span className="bg-[var(--primary)] text-white text-xs px-2 py-0.5 rounded-full">{items.length}</span>
                    </h2>
                </div>

                <div className="flex-1 p-4 overflow-hidden relative">
                    <Cart />
                </div>

                <div className="p-4 bg-[var(--bg)] border-t border-[var(--border)]">
                    <Button
                        className="w-full h-12 text-lg font-bold shadow-md"
                        disabled={items.length === 0}
                        onClick={() => setPayModalOpen(true)}
                    >
                        Cobrar {items.length > 0 && `• $${getTotals().total.toFixed(2)}`}
                    </Button>
                </div>
            </div>

            {isPayModalOpen && (
                <PaymentModal
                    total={getTotals().total}
                    onClose={() => setPayModalOpen(false)}
                    onConfirm={handleCheckout}
                    isLoading={isProcessing}
                />
            )}
        </div>
    );
};

export default SalesView;
