import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/sales/ConfirmModal';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Plus, Trash2, RefreshCw, History, Package, Search, Edit3, X, ScanLine } from 'lucide-react';
import { formatMoney } from '../utils/format';
import { MovementHistoryModal } from '../components/products/MovementHistoryModal';
import { ViewContainer } from '../components/layout/ViewContainer';
import { ViewHeader } from '../components/layout/ViewHeader';
import { cn } from '../utils/cn';

const ProductCard = memo(function ProductCard({ p, onEdit, onDelete }) {
  return (
    <div className="relative rounded-xl border border-border/30 bg-card p-3 hover:border-primary/30 transition-colors flex flex-col cursor-pointer"
      onClick={() => onEdit(p)}
    >
      <button className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-muted text-muted-foreground opacity-60 hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); onEdit(p); }}
        aria-label="Editar producto">
        <Edit3 className="size-3.5" />
      </button>

      <div className="size-16 rounded-xl bg-muted/50 flex items-center justify-center mb-3 border border-border/20 mx-auto">
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} className="size-full object-cover rounded-xl" loading="lazy" />
        ) : (
          <Package className="size-7 text-muted-foreground/50" aria-hidden="true" />
        )}
      </div>

      <h3 className="font-semibold text-sm mb-1 line-clamp-2 min-h-[2.2rem] leading-tight text-center">{p.name}</h3>

      <div className="mt-auto pt-2 space-y-1.5 w-full text-center">
        <p className="text-lg font-bold text-primary tracking-tight">
          {formatMoney(p.price)}
        </p>
        {(p.barcodes?.length > 0 || p.sku) && (
          <p className="text-[10px] text-muted-foreground/60 font-mono truncate">
            {p.barcodes?.[0]?.code || p.sku}
          </p>
        )}
        <Badge
          variant={p.stock <= 0 ? 'danger' : p.stock <= 5 ? 'warning' : 'success'}
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
  const deleteDialog = useConfirmDialog();
  const [search, setSearch] = useState('');
  const searchTimerRef = useRef(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', stock: '999', sku: '', barcode: '' });
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
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => loadData(null), 300);
  }, [loadData]);

  useEffect(() => () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const barcodeValue = form.barcode.trim();
      const payload = {
        name: form.name,
        price: parseFloat(form.price) || 0,
        stock: parseFloat(form.stock) || 0,
        sku: form.sku || barcodeValue || `SKU-${Date.now()}`,
        barcodes: barcodeValue ? [barcodeValue] : [],
      };

      if (editingProduct) {
        await api(`/products/${editingProduct.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast('Producto actualizado', 'success');
      } else {
        await api('/products', { method: 'POST', body: JSON.stringify(payload) });
        toast('Producto creado', 'success');
      }

      setForm({ name: '', price: '', stock: '999', sku: '', barcode: '' });
      setEditingProduct(null);
      setModalOpen(false);
      await loadData(null);
    } catch (e) {
      toast('Error al guardar: ' + e.message, 'error');
    } finally { setSaving(false); }
  };

  const handleEdit = useCallback((p) => {
    setEditingProduct(p);
    const existingBarcode = (p.barcodes && p.barcodes.length > 0) ? (typeof p.barcodes[0] === 'string' ? p.barcodes[0] : p.barcodes[0]?.code || '') : '';
    setForm({ name: p.name, price: p.price.toString(), stock: p.stock.toString(), sku: p.sku || '', barcode: existingBarcode });
    setModalOpen(true);
  }, []);

  const handleDeleteRequest = (id) => {
    deleteDialog.open(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.target) return;
    try {
      await api(`/products/${deleteDialog.target}`, { method: 'DELETE' });
      toast('Producto archivado', 'success');
      deleteDialog.close();
      await loadData(null);
    } catch (e) {
      toast('Error al archivar: ' + e.message, 'error');
    }
  };

  return (
    <ViewContainer>
      <ViewHeader
        title="Inventario"
        description={pagination.total > 0 ? `${pagination.total} productos` : 'Gestiona tus productos'}
      >
        <Button variant="ghost" size="icon" onClick={() => loadData(null)} className="rounded-lg border border-border/30">
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
        </Button>
        <Button onClick={() => { setEditingProduct(null); setForm({ name: '', price: '', stock: '999', sku: '' }); setModalOpen(true); }}
          size="md" className="font-bold">
          <Plus className="size-4 mr-1" /> Nuevo Producto
        </Button>
      </ViewHeader>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Buscar por nombre o código de barras..."
          className="w-full h-[var(--control-xl)] pl-10 pr-4 rounded-xl border border-border/30 bg-card text-sm font-medium focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/8 transition-all placeholder:text-muted-foreground/40"
          value={search}
          onChange={handleSearch}
          aria-label="Buscar productos"
        />
      </div>

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
              <ProductCard key={p.id} p={p} onEdit={handleEdit} onDelete={handleDeleteRequest} />
            ))}
          </div>

          {pagination.hasMore && (
            <div className="flex justify-center pt-3">
              <Button variant="secondary" onClick={() => loadData(pagination.nextCursor)} isLoading={loadingMore} size="md" className="font-bold border border-border/30">
                {loadingMore ? 'Cargando...' : 'Cargar más productos'}
              </Button>
            </div>
          )}
        </>
      )}

      <Modal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
        description="Nombre y precio, el resto es automático"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground/70">Nombre del producto</label>
            <Input placeholder="Ej: Coca Cola 600ml..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              required autoFocus={!editingProduct} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground/70">Precio de venta</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground z-10">$</span>
                <Input className="pl-7" placeholder="0.00" type="number" step="0.01" min="0"
                  value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground/70">Stock inicial</label>
              <Input placeholder="999" type="number" min="0"
                value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground/70 flex items-center gap-1.5">
              <ScanLine className="size-3" /> Codigo de barras
            </label>
            <Input
              placeholder="Escanear o escribir codigo de barras..."
              value={form.barcode}
              onChange={e => setForm({ ...form, barcode: e.target.value })}
              autoComplete="off"
            />
            <p className="text-[10px] text-muted-foreground/60">Escribe o escanea el codigo de barras del producto</p>
          </div>

          {editingProduct && (
            <div className="flex justify-between items-center pt-1">
              <button type="button" className="text-xs font-semibold text-danger hover:bg-danger/10 px-2 py-1.5 rounded-lg transition-colors touch-target"
                onClick={() => handleDeleteRequest(editingProduct.id)}>
                <Trash2 className="size-3.5 inline mr-1" /> Archivar
              </button>
              <button type="button" className="text-xs font-semibold text-info hover:bg-info/10 px-2 py-1.5 rounded-lg transition-colors touch-target"
                onClick={() => { setKardexProduct(editingProduct); setModalOpen(false); }}>
                <History className="size-3.5 inline mr-1" /> Historial
              </button>
            </div>
          )}

          <Button type="submit" isLoading={saving} disabled={!form.name.trim()} size="md" className="w-full font-bold">
            {editingProduct ? 'Guardar Cambios' : 'Guardar Producto'}
          </Button>
        </form>
      </Modal>

      <ConfirmModal
        open={deleteDialog.isOpen}
        title="Archivar Producto"
        message="¿Estás seguro de archivar este producto? Podrás recuperarlo después."
        confirmLabel="Archivar"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={deleteDialog.close}
      />

      {kardexProduct && (
        <MovementHistoryModal product={kardexProduct} onClose={() => setKardexProduct(null)} />
      )}
    </ViewContainer>
  );
};

export default ProductsView;
