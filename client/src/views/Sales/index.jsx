import React, { useState } from 'react';
import { ProductSearch } from '../../components/sales/ProductSearch';
import { Cart } from '../../components/sales/Cart';
import { PaymentModal } from '../../components/sales/PaymentModal';
import { useCartStore } from '../../store/useCartStore';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { api } from '../../lib/api';
import { Plus, Trash2, ShoppingBag, Zap, DollarSign } from 'lucide-react';
import { cn } from '../../utils/cn';

const SalesView = () => {
    const { items, getTotals, clearCart, addItem } = useCartStore();
    const [isPayModalOpen, setPayModalOpen] = useState(false);
    const [isProcessing, setProcessing] = useState(false);
    const [isManualModalOpen, setManualModalOpen] = useState(false);
    const [manualForm, setManualForm] = useState({ name: '', price: '' });
    const searchInputRef = React.useRef(null);

    // Auto-focus search on mount and after actions
    const focusSearch = () => {
        const input = document.querySelector('input[placeholder*="Escanear"]');
        if (input) input.focus();
    };

    React.useEffect(() => {
        focusSearch();
    }, []);

    const handleCheckout = async (paymentData) => {
        setProcessing(true);
        try {
            const { total, discount, subtotal, tax } = getTotals();
            const payments = paymentData.payments || [{ method: paymentData.method, amount: total }];

            const payload = {
                items: items.map(i => ({ product_id: i.id, quantity: i.quantity, unit_price: i.price })),
                discount,
                payment_method: paymentData.method,
                payments
            };

            const res = await api('/sales', { method: 'POST', body: JSON.stringify(payload) });

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
            setTimeout(focusSearch, 100);
        } catch (e) {
            alert('Error al procesar la venta: ' + e.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleAddManual = (e) => {
        e.preventDefault();
        if (!manualForm.name || !manualForm.price) return;
        
        addItem({
            id: `manual-${Date.now()}`,
            name: manualForm.name,
            price: parseFloat(manualForm.price),
            isManual: true
        });
        
        setManualForm({ name: '', price: '' });
        setManualModalOpen(false);
        focusSearch();
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
        <div className="h-[calc(100vh-80px)] flex gap-4 p-2 overflow-hidden bg-[var(--bg)]">
            {/* Left Column: Search & Quick Products */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
                <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)] shadow-sm flex gap-3">
                    <div className="flex-1">
                        <ProductSearch />
                    </div>
                    <Button 
                        onClick={() => setManualModalOpen(true)}
                        className="h-14 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center gap-2"
                        title="Venta de producto no registrado"
                    >
                        <Zap className="h-5 w-5" />
                        <span className="hidden lg:inline">Producto Manual</span>
                    </Button>
                </div>

                {/* Quick Products Grid - High touch target */}
                <div className="flex-1 bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {/* Example of how Quick Products would look */}
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <button
                                key={i}
                                className="aspect-square bg-[var(--bg-muted)] hover:bg-[var(--secondary)] border border-[var(--border)] rounded-2xl flex flex-col items-center justify-center p-3 transition-all active:scale-95 group shadow-sm"
                            >
                                <div className="h-12 w-12 bg-white/50 rounded-xl mb-2 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <span className="text-xl">📦</span>
                                </div>
                                <span className="text-xs font-bold text-center line-clamp-2">Producto Rápido {i}</span>
                                <span className="text-sm font-black text-[hsl(var(--primary))] mt-1">$0.00</span>
                            </button>
                        ))}
                        
                        <div className="aspect-square border-2 border-dashed border-[var(--border)] rounded-2xl flex items-center justify-center text-[var(--muted-foreground)] text-xs text-center p-4">
                            Toca para asignar producto favorito
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Cart - Optimized for touch */}
            <div className="w-[450px] flex flex-col bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl h-full overflow-hidden">
                <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-muted)] flex justify-between items-center">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        🛒 Carrito
                        <span className="bg-[hsl(var(--primary))] text-white text-xs px-2.5 py-1 rounded-full shadow-sm">{items.length}</span>
                    </h2>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:bg-red-50 h-10 px-4 font-bold"
                        onClick={() => { if(window.confirm('¿Vaciar carrito?')) clearCart(); }}
                        disabled={items.length === 0}
                    >
                        Vaciar
                    </Button>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    <Cart />
                </div>

                <div className="p-6 bg-[var(--bg)] border-t-2 border-[var(--border)] space-y-4 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[var(--muted-foreground)] font-medium">Total a pagar:</span>
                        <span className="text-4xl font-black text-[hsl(var(--primary))] tracking-tighter">
                            ${getTotals().total.toFixed(2)}
                        </span>
                    </div>
                    
                    <Button
                        className="w-full h-20 text-2xl font-black shadow-lg shadow-[hsl(var(--primary))/0.2] rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-4"
                        disabled={items.length === 0}
                        onClick={() => setPayModalOpen(true)}
                    >
                        <span>COBRAR</span>
                        <div className="h-10 w-px bg-white/20" />
                        <span>F2</span>
                    </Button>
                </div>
            </div>

            {/* Modal Producto Manual */}
            {isManualModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-md">
                    <div className="bg-[var(--card)] w-full max-w-md p-8 rounded-[2rem] shadow-2xl border-4 border-[var(--border)] relative animate-in fade-in zoom-in duration-200">
                        <button 
                            onClick={() => setManualModalOpen(false)}
                            className="absolute top-6 right-6 p-2 hover:bg-red-50 text-red-500 rounded-xl"
                        >
                            <Plus className="h-6 w-6 rotate-45" />
                        </button>

                        <h2 className="text-2xl font-black mb-6 tracking-tight">Producto Manual</h2>
                        
                        <form onSubmit={handleAddManual} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">¿Qué es?</label>
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
