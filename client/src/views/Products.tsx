import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Column } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import { api } from '../lib/api';
import { formatMoney } from '../utils/format';
import { Package, Plus, Pencil, Trash2, MoveVertical } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: number;
  cost?: number;
  stock: number;
  min_stock?: number;
  category?: string;
  barcode?: string;
  created_at: string;
}

export default function ProductsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });
  const [form, setForm] = useState({ name: '', price: '', cost: '', stock: '', min_stock: '', category: '', barcode: '' });
  const toast = useToast();
  const [movementModal, setMovementModal] = useState<{ open: boolean; productId: number | null }>({ open: false, productId: null });
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  const load = useCallback(async (reset = true) => {
    setLoading(true);
    try {
      if (reset) {
        const data = await api('/products?take=200');
        const result = Array.isArray(data) ? data : data?.data || [];
        setProducts(result);
        setHasMore(data?.pagination?.hasMore || false);
        setCursor(data?.pagination?.nextCursor || null);
      } else if (cursor) {
        const data = await api(`/products?take=200&cursor=${cursor}`);
        const result = Array.isArray(data) ? data : data?.data || [];
        setProducts(prev => [...prev, ...result]);
        setHasMore(data?.pagination?.hasMore || false);
        setCursor(data?.pagination?.nextCursor || null);
      }
    } catch { toast('Error al cargar productos', 'error'); }
    finally { setLoading(false); }
  }, [toast, cursor]);

  useEffect(() => { load(true); }, []);

  const openCreate = () => {
    setForm({ name: '', price: '', cost: '', stock: '0', min_stock: '5', category: '', barcode: '' });
    setEditModal({ open: true, product: null });
  };

  const openEdit = (p: Product) => {
    setForm({ name: p.name, price: String(p.price), cost: String(p.cost || ''), stock: String(p.stock), min_stock: String(p.min_stock || ''), category: p.category || '', barcode: p.barcode || '' });
    setEditModal({ open: true, product: p });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { name: form.name, price: parseFloat(form.price), cost: form.cost ? parseFloat(form.cost) : undefined, stock: parseInt(form.stock) || 0, min_stock: form.min_stock ? parseInt(form.min_stock) : undefined, category: form.category || undefined, barcode: form.barcode || undefined };
      if (editModal.product) {
        await api(`/products/${editModal.product.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast('Producto actualizado', 'success');
      } else {
        await api('/products', { method: 'POST', body: JSON.stringify(payload) });
        toast('Producto creado', 'success');
      }
      setEditModal({ open: false, product: null });
      load();
    } catch { toast('Error al guardar', 'error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Eliminar este producto?')) return;
    try { await api(`/products/${id}`, { method: 'DELETE' }); toast('Producto eliminado', 'success'); load(); }
    catch { toast('Error al eliminar', 'error'); }
  };

  const columns: Column<Product>[] = useMemo(() => [
    { key: 'name', label: 'Producto', render: p => <span className="font-semibold text-text-primary text-sm">{p.name}</span> },
    { key: 'price', label: 'Precio', render: p => <span className="font-semibold tabular-nums">{formatMoney(p.price)}</span> },
    { key: 'stock', label: 'Stock', render: p => {
      const isLow = p.min_stock != null && p.stock <= p.min_stock;
      const isOut = p.stock <= 0;
      return (
        <div className="flex items-center gap-2">
          <span className={isOut ? 'text-danger font-bold' : isLow ? 'text-warning font-bold' : 'text-text-primary font-semibold'}>
            {p.stock}
          </span>
          {isLow && !isOut && <Badge variant="warning" size="xs">Bajo</Badge>}
          {isOut && <Badge variant="danger" size="xs">Agotado</Badge>}
        </div>
      );
    }},
    { key: 'category', label: 'Categoria', hideOnMobile: true, render: p => p.category ? <Badge variant="neutral" size="xs">{p.category}</Badge> : <span className="text-text-disabled">-</span> },
    { key: 'actions', label: '', render: p => (
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        <button onClick={() => openEdit(p)} className="size-8 rounded-md flex items-center justify-center text-text-tertiary hover:text-accent hover:bg-accent-bg transition-colors" aria-label="Editar"><Pencil className="size-3.5" /></button>
        <button onClick={() => setMovementModal({ open: true, productId: p.id })} className="size-8 rounded-md flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover transition-colors" aria-label="Movimientos"><MoveVertical className="size-3.5" /></button>
        <button onClick={() => handleDelete(p.id)} className="size-8 rounded-md flex items-center justify-center text-text-tertiary hover:text-danger hover:bg-danger-bg transition-colors" aria-label="Eliminar"><Trash2 className="size-3.5" /></button>
      </div>
    ), className: 'w-[120px] text-right' },
  ], []);

  return (
    <div className="group">
      <PageHeader
        title="Inventario"
        description="Gestion de productos, precios y existencias"
        icon={Package}
        actions={<Button onClick={openCreate} size="sm"><Plus className="size-3.5" />Nuevo Producto</Button>}
      />

      <Table
        columns={columns}
        data={products}
        keyExtractor={p => String(p.id)}
        loading={loading}
        searchable
        searchPlaceholder="Buscar por nombre, categoria o codigo..."
        emptyMessage="No hay productos registrados"
        emptyIcon={Package}
        density="comfortable"
      />

      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, product: null })} title={editModal.product ? 'Editar Producto' : 'Nuevo Producto'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Nombre</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Precio</label>
              <Input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Costo</label>
              <Input type="number" step="0.01" min="0" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Stock</label>
              <Input type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Stock Minimo</label>
              <Input type="number" min="0" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Categoria</label>
              <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Codigo de Barras</label>
              <Input value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setEditModal({ open: false, product: null })}>Cancelar</Button>
            <Button type="submit" className="flex-1">{editModal.product ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>

      {movementModal.productId && <MovementHistoryModal productId={movementModal.productId} onClose={() => setMovementModal({ open: false, productId: null })} />}
    </div>
  );
}

function MovementHistoryModal({ productId, onClose }: { productId: number; onClose: () => void }) {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/products/${productId}/movements`).then(data => {
      setMovements(Array.isArray(data) ? data : data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [productId]);

  return (
    <Modal open={true} onClose={onClose} title="Historial de Movimientos" size="lg">
      {loading ? <p className="text-sm text-text-tertiary text-center py-8">Cargando...</p> :
       movements.length === 0 ? <p className="text-sm text-text-tertiary text-center py-8">Sin movimientos</p> :
       <Table
         columns={[
           { key: 'type', label: 'Tipo', render: m => <Badge variant={m.type === 'in' ? 'success' : m.type === 'out' ? 'danger' : 'neutral'} size="xs">{m.type}</Badge> },
           { key: 'quantity', label: 'Cantidad', render: m => <span className="font-bold tabular-nums">{m.type === 'out' ? '-' : '+'}{m.quantity}</span> },
           { key: 'reason', label: 'Motivo' },
           { key: 'created_at', label: 'Fecha', render: m => new Date(m.created_at).toLocaleString() },
         ]}
         data={movements}
         keyExtractor={m => String(m.id)}
         density="compact"
       />}
    </Modal>
  );
}
