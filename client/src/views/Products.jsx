import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Table } from '../components/common/Table';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card } from '../components/common/Card';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { formatMoney } from '../utils/format';

const ProductsView = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: '', sku: '', price: '', stock: '' });
    const [saving, setSaving] = useState(false);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await api('/products');
            setProducts(data);
        } catch (e) {
            console.error(e);
            // alert('Error al cargar productos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProducts();
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
                    stock: parseFloat(form.stock) || 0
                })
            });
            setForm({ name: '', sku: '', price: '', stock: '' });
            await loadProducts();
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
            await loadProducts();
        } catch (e) {
            alert('Error al eliminar');
        }
    };

    const columns = [
        { title: 'SKU', key: 'sku', className: 'font-mono' },
        { title: 'Nombre', key: 'name', className: 'font-medium' },
        { title: 'Precio', key: 'price', render: (row) => formatMoney(row.price) },
        {
            title: 'Stock', key: 'stock', render: (row) => (
                <span className={row.stock <= 0 ? "text-red-500 font-bold" : "text-green-600"}>
                    {row.stock}
                </span>
            )
        },
        {
            title: 'Acciones', key: 'actions', render: (row) => (
                <Button variant="danger" size="icon" onClick={() => handleDelete(row.id)} className="h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                </Button>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Productos</h1>
                <Button variant="ghost" onClick={loadProducts} isLoading={loading}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
                </Button>
            </div>

            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Nuevo Producto</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="md:col-span-2">
                        <Input
                            placeholder="Nombre del producto"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <Input
                            placeholder="SKU"
                            value={form.sku}
                            onChange={e => setForm({ ...form, sku: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Input
                            placeholder="Precio"
                            type="number"
                            step="0.01"
                            value={form.price}
                            onChange={e => setForm({ ...form, price: e.target.value })}
                            required
                        />
                        <Input
                            placeholder="Stock"
                            type="number"
                            step="1"
                            value={form.stock}
                            onChange={e => setForm({ ...form, stock: e.target.value })}
                            required
                        />
                    </div>
                    <Button type="submit" isLoading={saving}>
                        <Plus className="h-4 w-4 mr-2" /> Agregar
                    </Button>
                </form>
            </Card>

            <Table
                columns={columns}
                data={products}
                searchPlaceholder="Buscar por nombre o SKU..."
            />
        </div>
    );
};

export default ProductsView;
