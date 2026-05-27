import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Plus, Trash2, RefreshCw, History, Package, Search, Edit3, X } from 'lucide-react';
import { formatMoney } from '../utils/format';
import { MovementHistoryModal } from '../components/products/MovementHistoryModal';
import { cn } from '../utils/cn';

const ProductCard = memo(function ProductCard({ p, onEdit, onDelete }) {
  return (
    <div className="relative rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors flex flex-col cursor-pointer"
      onClick={() => onEdit(p)}
    >
      <button className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-muted text-muted-foreground opacity-60 hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); onEdit(p); }}
        aria-label="Editar producto">
        <Edit3 className="size-3.5" />
      </button>

      <div className="size-16 rounded-lg bg-muted flex items-center justify-center mb-3 border border-border mx-auto">
        {p.image_url ? (
          <img src={p.image_url} alt="" className="size-full object-cover rounded-lg" />
        ) : (
          <Package className="size-7 text-muted-foreground/50" />
        )}
      </div>

      <h3 className="font-semibold text-sm mb-1 line-clamp-2 min-h-[2.2rem] leading-tight text-center">{p.name}</h3>

      <div className="mt-auto pt-2 space-y-1.5 w-full text-center">
        <p className="text-lg font-bold text-primary tracking-tight">
          {formatMoney(p.price)}
        </p>
        <Badge
          variant={p.stock <= 5 ? 'warning' : 'success'}
          size="sm"
          className="text-[9px]"
        >
          Stock: {Number(p.stock).toFixed(0)}
        </Badge>
      </div>
    </div>
  );
});

const ProductsView = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchTimer, setSearchTimer] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', stock: '999', sku: '' });
  const [saving, setSaving] = useState(false);
  const [kardexProduct, setKardexProduct] = useState(null);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ nextCursor: null, hasMore: false, total: 0 });
  const searchRef = useRef(null);
  const toast = useToast();

  const loadData = useCallback(async (cursor) => {
    if (!cursor) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (cursor) params.set('cursor', cursor);
      params.set('take', '50');
      if (search) params.set('q', search);

      const res = await api(`/products?${params.toString()}`);
      const data = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      const pag = res.pagination || { nextCursor: null, hasMore: false, total: data.length };

      if (!cursor) setProducts(data);
      else setProducts(prev => [...prev, ...data]);
      setPagination(pag);
    } catch (e) {
      console.error(e);
      setError(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search]);

  useEffect(() => { loadData(null); }, [loadData]);

  const handleSearch = useCallback((e) => {
    const value = e.target.value;
    setSearch(value);
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => loadData(null), 300);
    setSearchTimer(timer);
  }, [searchTimer, loadData]);

  useEffect(() => () => { if (searchTimer) clearTimeout(searchTimer); }, [searchTimer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price) || 0,
        stock: parseFloat(form.stock) || 0,
        sku: form.sku || `SKU-${Date.now()}`,
      };

      if (editingProduct) {
        await api(`/products/${editingProduct.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast('Producto actualizado', 'success');
      } else {
        await api('/products', { method: 'POST', body: JSON.stringify(payload) });
        toast('Producto creado', 'success');
      }

      setForm({ name: '', price: '', stock: '999', sku: '' });
      setEditingProduct(null);
      setModalOpen(false);
      await loadData(null);
    } catch (e) {
      toast('Error al guardar: ' + e.message, 'error');
    } finally { setSaving(false); }
  };

  const handleEdit = useCallback((p) => {
    setEditingProduct(p);
    setForm({ name: p.name, price: p.price.toString(), stock: p.stock.toString(), sku: p.sku || '' });
    setModalOpen(true);
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Archivar este producto?')) return;
    try {
      await api(`/products/${id}`, { method: 'DELETE' });
      toast('Producto archivado', 'success');
      await loadData(null);
    } catch (e) {
      toast('Error al archivar: ' + e.message, 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
          <p className="text-muted-foreground font-medium text-xs">
            {pagination.total > 0 ? `${pagination.total} productos` : 'Gestiona tus productos'}
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="ghost" size="icon" onClick={() => loadData(null)} className="rounded-lg border border-border">
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
          </Button>
          <Button onClick={() => { setEditingProduct(null); setForm({ name: '', price: '', stock: '999', sku: '' }); setModalOpen(true); }}
            size="md" className="font-bold">
            <Plus className="size-4 mr-1" /> Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Buscar por nombre o código de barras..."
          className="w-full h-12 pl-10 pr-4 rounded-lg border border-border bg-card text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors placeholder:text-muted-foreground/40"
          value={search}
          onChange={handleSearch}
        />
      </div>

      {/* Content */}
      {error ? (
        <ErrorState error={error.message || error} onRetry={() => loadData(null)} />
      ) : loading && products.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No hay productos"
          description="Comienza agregando tu primer producto"
          action={{ label: 'Crear Producto', onClick: () => { setEditingProduct(null); setForm({ name: '', price: '', stock: '999', sku: '' }); setModalOpen(true); } }}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>

          {pagination.hasMore && (
            <div className="flex justify-center pt-3">
              <Button variant="secondary" onClick={() => loadData(pagination.nextCursor)} isLoading={loadingMore} size="md" className="font-bold border">
                {loadingMore ? 'Cargando...' : 'Cargar más productos'}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Product modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100]">
          <div className="bg-card w-full max-w-lg rounded-xl border border-border shadow-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold">
                  {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                </h2>
                <p className="text-muted-foreground text-xs font-medium">Nombre y precio, el resto es automático</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors" aria-label="Cerrar">
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Nombre del producto</label>
                <Input placeholder="Ej: Coca Cola 600ml..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  required autoFocus={!editingProduct} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Precio de venta</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground z-10">$</span>
                    <Input className="pl-7" placeholder="0.00" type="number" step="0.01" min="0"
                      value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Stock inicial</label>
                  <Input placeholder="999" type="number" min="0"
                    value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
                </div>
              </div>

              {editingProduct && (
                <div className="flex justify-between items-center pt-1">
                  <button type="button" className="text-xs font-semibold text-danger hover:bg-danger/10 px-2 py-1 rounded-lg transition-colors"
                    onClick={() => handleDelete(editingProduct.id)}>
                    <Trash2 className="size-3.5 inline mr-1" /> Archivar
                  </button>
                  <button type="button" className="text-xs font-semibold text-info hover:bg-info/10 px-2 py-1 rounded-lg transition-colors"
                    onClick={() => { setKardexProduct(editingProduct); setModalOpen(false); }}>
                    <History className="size-3.5 inline mr-1" /> Historial
                  </button>
                </div>
              )}

              <Button type="submit" isLoading={saving} disabled={!form.name.trim()} size="md" className="w-full font-bold">
                {editingProduct ? 'Guardar Cambios' : 'Guardar Producto'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {kardexProduct && (
        <MovementHistoryModal product={kardexProduct} onClose={() => setKardexProduct(null)} />
      )}
    </div>
  );
};

export default ProductsView;
