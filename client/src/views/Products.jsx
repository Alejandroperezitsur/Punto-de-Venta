import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import ErrorState from '../components/states/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Plus, Trash2, RefreshCw, History, Package, Search, Edit3, X } from 'lucide-react';
import { formatMoney } from '../utils/format';
import { MovementHistoryModal } from '../components/products/MovementHistoryModal';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

const ProductCard = memo(function ProductCard({ p, onEdit }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative rounded-3xl border-2 border-border bg-card p-5 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col items-center text-center cursor-pointer"
      onClick={() => onEdit(p)}
    >
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-2 rounded-xl hover:bg-muted text-muted-foreground" onClick={(e) => { e.stopPropagation(); onEdit(p); }}>
          <Edit3 className="size-4" />
        </button>
      </div>

      <div className="size-24 rounded-2xl bg-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform overflow-hidden border border-border">
        {p.image_url ? (
          <img src={p.image_url} alt="" className="size-full object-cover" />
        ) : (
          <Package className="size-10 text-muted-foreground/50" />
        )}
      </div>

      <h3 className="font-bold text-base mb-1 line-clamp-2 min-h-[2.5rem] leading-tight">{p.name}</h3>

      <div className="mt-auto pt-3 space-y-2.5 w-full">
        <p className="text-2xl font-black text-primary tracking-tighter">
          {formatMoney(p.price)}
        </p>
        <Badge
          variant={p.stock <= 5 ? 'warning' : 'success'}
          size="sm"
          className="text-[10px]"
        >
          Stock: {Number(p.stock).toFixed(0)}
        </Badge>
      </div>
    </motion.div>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">Inventario</h1>
          <p className="text-muted-foreground font-medium text-sm">
            {pagination.total > 0 ? `${pagination.total} productos` : 'Gestiona tus productos'}
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="ghost" size="icon" onClick={() => loadData(null)} className="rounded-2xl border border-border">
            <RefreshCw className={cn('size-5', loading && 'animate-spin')} />
          </Button>
          <Button onClick={() => { setEditingProduct(null); setForm({ name: '', price: '', stock: '999', sku: '' }); setModalOpen(true); }}
            size="lg" className="font-bold shadow-lg shadow-primary/20">
            <Plus className="size-5 mr-1" /> Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Buscar por nombre o código de barras..."
          className="w-full h-16 pl-14 pr-6 rounded-3xl border-2 border-border bg-card text-lg font-bold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40"
          value={search}
          onChange={handleSearch}
        />
      </div>

      {/* Content */}
      {error ? (
        <ErrorState error={error.message || error} onRetry={() => loadData(null)} />
      ) : loading && products.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-3xl" />
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
            <AnimatePresence mode="popLayout">
              {products.map((p) => (
                <ProductCard key={p.id} p={p} onEdit={handleEdit} />
              ))}
            </AnimatePresence>
          </div>

          {pagination.hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="secondary" onClick={() => loadData(pagination.nextCursor)} isLoading={loadingMore} size="lg" className="font-bold border-2">
                {loadingMore ? 'Cargando...' : 'Cargar más productos'}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Product modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="bg-card w-full max-w-xl rounded-4xl border border-border shadow-2xl p-8"
          >
            <button onClick={() => setModalOpen(false)} className="float-right p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors" aria-label="Cerrar">
              <X className="size-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-black tracking-tighter">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <p className="text-muted-foreground text-sm font-medium">Nombre y precio, el resto es automático</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Nombre del producto</label>
                <Input placeholder="Ej: Coca Cola 600ml..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  required autoFocus={!editingProduct} size="lg" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Precio de venta</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground z-10">$</span>
                    <Input className="pl-8" placeholder="0.00" type="number" step="0.01" min="0"
                      value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Stock inicial</label>
                  <Input placeholder="999" type="number" min="0"
                    value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
                </div>
              </div>

              {editingProduct && (
                <div className="flex justify-between items-center pt-2">
                  <Button type="button" variant="ghost" className="text-danger hover:bg-danger/10 font-bold"
                    onClick={() => handleDelete(editingProduct.id)}>
                    <Trash2 className="size-4 mr-1" /> Archivar
                  </Button>
                  <Button type="button" variant="ghost" className="text-info hover:bg-info/10 font-bold"
                    onClick={() => { setKardexProduct(editingProduct); setModalOpen(false); }}>
                    <History className="size-4 mr-1" /> Historial
                  </Button>
                </div>
              )}

              <Button type="submit" isLoading={saving} disabled={!form.name.trim()} size="xl" className="w-full font-bold shadow-lg shadow-primary/20">
                {editingProduct ? 'Guardar Cambios' : 'Guardar Producto'}
              </Button>
            </form>
          </motion.div>
        </div>
      )}

      {kardexProduct && (
        <MovementHistoryModal product={kardexProduct} onClose={() => setKardexProduct(null)} />
      )}
    </div>
  );
};

export default ProductsView;
