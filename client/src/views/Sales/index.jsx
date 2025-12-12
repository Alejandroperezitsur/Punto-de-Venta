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
            const { total, discount } = getTotals();
            const payload = {
                items: items.map(i => ({ product_id: i.id, quantity: i.quantity, unit_price: i.price })),
                discount,
                payment_method: paymentData.method,
                payments: [{ method: paymentData.method, amount: total }]
            };

            await api('/sales', { method: 'POST', body: JSON.stringify(payload) });

            // Success
            clearCart();
            setPayModalOpen(false);
            // Ideally show a success toast or print ticket here
            alert('Venta completada con éxito'); // Simple feedback for now
        } catch (e) {
            alert('Error al procesar la venta: ' + e.message);
        } finally {
            setProcessing(false);
        }
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
