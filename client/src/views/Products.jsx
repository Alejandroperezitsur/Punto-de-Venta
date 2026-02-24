import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card } from '../components/common/Card';
import { Plus, Trash2, RefreshCw, History, Image as ImageIcon, Search, Edit3, Package, MoreVertical } from 'lucide-react';
import { formatMoney } from '../utils/format';
import { MovementHistoryModal } from '../components/products/MovementHistoryModal';
import { cn } from '../utils/cn';

const ProductsView = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [editingProduct, setEditingProduct] = useState(null);
    const [form, setForm] = useState({ name: '', price: '', stock: '999', sku: '' });
    const [saving, setSaving] = useState(false);
    const [kardexProduct, setKardexProduct] = useState(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await api('/products');
            setProducts(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                price: parseFloat(form.price) || 0,
                stock: parseFloat(form.stock) || 0,
                sku: form.sku || `SKU-${Date.now()}`
            };

            if (editingProduct) {
                await api(`/products/${editingProduct.id}`, { method: 'PUT', body: JSON.stringify(payload) });
            } else {
                await api('/products', { method: 'POST', body: JSON.stringify(payload) });
            }

            setForm({ name: '', price: '', stock: '999', sku: '' });
            setEditingProduct(null);
            setModalOpen(false);
            await loadData();
        } catch (e) {
            alert('Error al guardar: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (p) => {
        setEditingProduct(p);
        setForm({ name: p.name, price: p.price.toString(), stock: p.stock.toString(), sku: p.sku });
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar producto?')) return;
        try {
            await api(`/products/${id}`, { method: 'DELETE' });
            await loadData();
        } catch (e) {
            alert('Error al eliminar');
        }
    };

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        p.sku?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 p-2">
            {/* Header Zen */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter">Inventario</h1>
                    <p className="text-[var(--muted-foreground)] font-medium">Gestiona tus productos de forma rápida</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <Button variant="ghost" onClick={loadData} className="h-14 px-6 rounded-2xl border-2 border-[var(--border)]">
                        <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
                    </Button>
                    <Button onClick={() => { setEditingProduct(null); setForm({ name: '', price: '', stock: '999', sku: '' }); setModalOpen(true); }} className="h-14 px-8 rounded-2xl text-lg font-bold flex-1 md:flex-none shadow-xl shadow-[hsl(var(--primary))/0.2]">
                        <Plus className="h-6 w-6 mr-2" /> Nuevo Producto
                    </Button>
                </div>
            </div>

            {/* Búsqueda Dominante */}
            <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-[var(--muted-foreground)] group-focus-within:text-[hsl(var(--primary))] transition-colors" />
                <input
                    type="text"
                    placeholder="Busca por nombre o código de barras..."
                    className="w-full h-20 pl-16 pr-8 bg-[var(--card)] border-4 border-[var(--border)] rounded-[2rem] text-2xl font-bold focus:outline-none focus:border-[hsl(var(--primary))] transition-all shadow-sm placeholder:text-gray-300"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Galería de Tarjetas */}
            {loading && products.length === 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="aspect-square bg-[var(--bg-muted)] animate-pulse rounded-[2.5rem]" />
                    ))}
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-[var(--bg-muted)] rounded-[3rem] border-4 border-dashed border-[var(--border)]">
                    <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center shadow-xl">
                        <Package className="h-12 w-12 text-gray-300" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black">No hay productos</h3>
                        <p className="text-[var(--muted-foreground)] font-medium">Comienza agregando tu primer producto en 10 segundos</p>
                    </div>
                    <Button onClick={() => setModalOpen(true)} className="h-14 px-8 rounded-2xl font-bold">
                        Crear Producto Ahora
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                    {filteredProducts.map((p) => (
                        <div 
                            key={p.id} 
                            className="group relative bg-[var(--card)] border-4 border-[var(--border)] rounded-[2.5rem] p-6 hover:border-[hsl(var(--primary))] hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center cursor-pointer"
                            onClick={() => handleEdit(p)}
                        >
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 hover:bg-[var(--bg-muted)] rounded-full text-[var(--muted-foreground)]">
                                    <Edit3 className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="h-28 w-28 bg-[var(--bg-muted)] rounded-[2rem] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform overflow-hidden border-2 border-[var(--border)]">
                                {p.image_url ? (
                                    <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <Package className="h-10 w-10 text-gray-300" />
                                )}
                            </div>

                            <h3 className="font-black text-xl mb-1 line-clamp-2 min-h-[3.5rem] leading-tight text-gray-800">
                                {p.name}
                            </h3>
                            
                            <div className="mt-auto pt-4 space-y-3 w-full">
                                <p className="text-3xl font-black text-[hsl(var(--primary))] tracking-tighter">
                                    {formatMoney(p.price)}
                                </p>
                                <div className={cn(
                                    "inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest",
                                    p.stock <= 5 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                                )}>
                                    Stock: {p.stock}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Creación Ultra Rápida */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-md">
                    <Card className="w-full max-w-xl p-10 rounded-[3rem] shadow-2xl border-4 border-[var(--border)] relative animate-in fade-in zoom-in duration-200">
                        <button 
                            onClick={() => setModalOpen(false)}
                            className="absolute top-8 right-8 p-3 hover:bg-red-50 text-red-500 rounded-2xl transition-all active:scale-90"
                        >
                            <Plus className="h-8 w-8 rotate-45" />
                        </button>

                        <div className="mb-8">
                            <h2 className="text-3xl font-black tracking-tighter">
                                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                            </h2>
                            <p className="text-[var(--muted-foreground)] font-medium">Solo nombre y precio, el resto es automático</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-sm font-black text-gray-400 uppercase tracking-widest ml-2">Nombre del producto</label>
                                <Input
                                    placeholder="Ej: Coca Cola 600ml..."
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    required
                                    autoFocus
                                    className="h-20 text-2xl font-bold px-8 rounded-[1.5rem]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-black text-gray-400 uppercase tracking-widest ml-2">Precio de venta</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-300">$</span>
                                        <Input
                                            className="h-20 text-3xl font-black pl-12 rounded-[1.5rem]"
                                            placeholder="0.00"
                                            type="number"
                                            step="0.01"
                                            value={form.price}
                                            onChange={e => setForm({ ...form, price: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-black text-gray-400 uppercase tracking-widest ml-2">Stock Inicial</label>
                                    <Input
                                        className="h-20 text-3xl font-black px-8 rounded-[1.5rem]"
                                        placeholder="999"
                                        type="number"
                                        value={form.stock}
                                        onChange={e => setForm({ ...form, stock: e.target.value })}
                                    />
                                </div>
                            </div>

                            {editingProduct && (
                                <div className="pt-4 flex justify-between items-center">
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        className="text-red-500 hover:bg-red-50 font-bold"
                                        onClick={() => handleDelete(editingProduct.id)}
                                    >
                                        <Trash2 className="h-5 w-5 mr-2" /> Eliminar Producto
                                    </Button>
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        className="text-blue-500 hover:bg-blue-50 font-bold"
                                        onClick={() => { setKardexProduct(editingProduct); setModalOpen(false); }}
                                    >
                                        <History className="h-5 w-5 mr-2" /> Ver Historial
                                    </Button>
                                </div>
                            )}

                            <Button 
                                type="submit" 
                                isLoading={saving} 
                                className="w-full h-24 text-2xl font-black rounded-[2rem] shadow-xl shadow-[hsl(var(--primary))/0.2]"
                            >
                                {editingProduct ? 'Guardar Cambios' : 'Guardar y Vender'}
                            </Button>
                        </form>
                    </Card>
                </div>
            )}

            {kardexProduct && (
                <MovementHistoryModal
                    product={kardexProduct}
                    onClose={() => setKardexProduct(null)}
                />
            )}
        </div>
    );
};

export default ProductsView;
