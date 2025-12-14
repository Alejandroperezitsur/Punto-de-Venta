import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Table } from '../components/common/Table';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card } from '../components/common/Card';
import { Plus, Trash2, RefreshCw, History, Image as ImageIcon, Search } from 'lucide-react';
import { formatMoney } from '../utils/format';
import { MovementHistoryModal } from '../components/products/MovementHistoryModal';

const ProductsView = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: '', sku: '', price: '', stock: '', category_id: '', image_url: '' });
    const [saving, setSaving] = useState(false);
    const [kardexProduct, setKardexProduct] = useState(null);

    const [predictions, setPredictions] = useState({});

    const loadData = async () => {
        setLoading(true);
        try {
            const [pData, cData, aiData] = await Promise.all([
                api('/products'),
                api('/categories'),
                api('/ai/inventory').catch(() => [])
            ]);
            setProducts(pData);
            setCategories(cData);

            const predMap = {};
            if (Array.isArray(aiData)) {
                aiData.forEach(p => predMap[p.productId] = p);
            }
            setPredictions(predMap);
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
            await api('/products', {
                method: 'POST',
                body: JSON.stringify({
                    ...form,
                    price: parseFloat(form.price) || 0,
                    stock: parseFloat(form.stock) || 0,
                    category_id: form.category_id ? parseInt(form.category_id) : null
                })
            });
            setForm({ name: '', sku: '', price: '', stock: '', category_id: '', image_url: '' });
            await loadData();
        } catch (e) {
            alert('Error al guardar: ' + e.message);
        } finally {
            setSaving(false);
        }
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

    const columns = [
        {
            title: '', key: 'image', className: 'w-12', render: (row) => (
                <div className="h-10 w-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                    {row.image_url ? (
                        <img src={row.image_url} alt="" className="h-full w-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                    ) : (
                        <ImageIcon className="h-4 w-4 text-gray-400" />
                    )}
                </div>
            )
        },
        { title: 'SKU', key: 'sku', className: 'font-mono text-xs text-gray-500' },
        { title: 'Nombre', key: 'name', className: 'font-medium' },
        {
            title: 'Categoría', key: 'category_id', render: (row) => {
                const cat = categories.find(c => c.id === row.category_id);
                return cat ? <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">{cat.name}</span> : '-';
            }
        },
        { title: 'Precio', key: 'price', render: (row) => formatMoney(row.price) },
        {
            title: 'Stock', key: 'stock', render: (row) => (
                <span className={`font-bold ${row.stock <= 5 ? "text-red-500" : "text-green-600"}`}>
                    {row.stock}
                </span>
            )
        },
        {
            title: 'Predicción', key: 'ai', render: (row) => {
                const pred = predictions[row.id];
                if (!pred) return <span className="text-gray-300">-</span>;
                return (
                    <div className="text-xs">
                        <div className={`font-bold ${pred.daysLeft <= 7 ? 'text-orange-600' : 'text-gray-600'}`}>
                            {pred.daysLeft} días
                        </div>
                        <div className="text-gray-400 text-[10px]">restantes</div>
                    </div>
                );
            }
        },
        {
            title: 'Acciones', key: 'actions', render: (row) => (
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setKardexProduct(row)} title="Ver Kardex" className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                        <History className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} className="h-8 w-8 text-red-500 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Inventario</h1>
                <Button variant="ghost" onClick={loadData} isLoading={loading}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
                </Button>
            </div>

            <Card className="p-6 border-[hsl(var(--border))] shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Nuevo Producto</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-3">
                        <label className="text-xs font-medium mb-1 block">Nombre</label>
                        <Input
                            placeholder="Nombre..."
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-medium mb-1 block">SKU</label>
                        <Input
                            placeholder="SKU-123"
                            value={form.sku}
                            onChange={e => setForm({ ...form, sku: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-medium mb-1 block">Categoría</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-[hsl(var(--border))] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                            value={form.category_id}
                            onChange={e => setForm({ ...form, category_id: e.target.value })}
                        >
                            <option value="">Sin Categoría</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-2 relative">
                        <label className="text-xs font-medium mb-1 block">Precio Venta</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                            <Input
                                className="pl-6"
                                placeholder="0.00"
                                type="number"
                                step="0.01"
                                value={form.price}
                                onChange={e => setForm({ ...form, price: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div className="md:col-span-1">
                        <label className="text-xs font-medium mb-1 block">Stock</label>
                        <Input
                            placeholder="0"
                            type="number"
                            step="1"
                            value={form.stock}
                            onChange={e => setForm({ ...form, stock: e.target.value })}
                            required
                        />
                    </div>
                    {/* Expandable Image URL Field logic can be added, for now placing inline or could take another row */}

                    <div className="md:col-span-2">
                        <Button type="submit" isLoading={saving} className="w-full">
                            <Plus className="h-4 w-4 mr-2" /> Agregar
                        </Button>
                    </div>

                    <div className="md:col-span-12">
                        <Input
                            placeholder="URL de Imagen (Opcional)"
                            value={form.image_url}
                            onChange={e => setForm({ ...form, image_url: e.target.value })}
                            icon={ImageIcon}
                        />
                    </div>
                </form>
            </Card>

            <Table
                columns={columns}
                data={products}
                searchPlaceholder="Buscar por nombre, SKU o código..."
            />

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
