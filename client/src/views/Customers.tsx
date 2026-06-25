import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Column } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { KpiCard } from '../components/ui/KpiCard';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import { api } from '../lib/api';
import { Users, Plus, Pencil, Trash2, ShoppingBag, Phone, Mail } from 'lucide-react';

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  total_purchases?: number;
  total_spent?: number;
  last_purchase?: string;
  created_at: string;
}

export default function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editModal, setEditModal] = useState<{ open: boolean; customer: Customer | null }>({ open: false, customer: null });
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/customers');
      setCustomers(Array.isArray(data) ? data : data.data || []);
    } catch { toast('Error al cargar clientes', 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ name: '', email: '', phone: '' });
    setEditModal({ open: true, customer: null });
  };

  const openEdit = (c: Customer) => {
    setForm({ name: c.name, email: c.email || '', phone: c.phone || '' });
    setEditModal({ open: true, customer: c });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { name: form.name, email: form.email || undefined, phone: form.phone || undefined };
      if (editModal.customer) {
        await api(`/customers/${editModal.customer.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast('Cliente actualizado', 'success');
      } else {
        await api('/customers', { method: 'POST', body: JSON.stringify(payload) });
        toast('Cliente creado', 'success');
      }
      setEditModal({ open: false, customer: null });
      load();
    } catch { toast('Error al guardar', 'error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Eliminar este cliente?')) return;
    try { await api(`/customers/${id}`, { method: 'DELETE' }); toast('Cliente eliminado', 'success'); load(); setSelectedCustomer(null); }
    catch { toast('Error al eliminar', 'error'); }
  };

  const stats = useMemo(() => {
    const total = customers.length;
    const withPurchases = customers.filter(c => (c.total_purchases || 0) > 0).length;
    const totalSpent = customers.reduce((acc, c) => acc + (c.total_spent || 0), 0);
    return { total, withPurchases, totalSpent };
  }, [customers]);

  const columns: Column<Customer>[] = useMemo(() => [
    { key: 'name', label: 'Cliente', render: c => (
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-full bg-bg-inset flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-text-secondary">{c.name?.charAt(0)?.toUpperCase()}</span>
        </div>
        <div>
          <p className="font-semibold text-sm text-text-primary">{c.name}</p>
          {c.email && <p className="text-xs text-text-tertiary">{c.email}</p>}
        </div>
      </div>
    )},
    { key: 'phone', label: 'Telefono', hideOnMobile: true, render: c => c.phone || <span className="text-text-disabled">-</span> },
    { key: 'total_purchases', label: 'Compras', render: c => <span className="font-semibold tabular-nums">{c.total_purchases || 0}</span> },
    { key: 'actions', label: '', render: c => (
      <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
        <button onClick={() => openEdit(c)} className="size-8 rounded-md flex items-center justify-center text-text-tertiary hover:text-accent hover:bg-accent-bg transition-colors" aria-label="Editar"><Pencil className="size-3.5" /></button>
        <button onClick={() => handleDelete(c.id)} className="size-8 rounded-md flex items-center justify-center text-text-tertiary hover:text-danger hover:bg-danger-bg transition-colors" aria-label="Eliminar"><Trash2 className="size-3.5" /></button>
      </div>
    ), className: 'w-[80px] text-right' },
  ], []);

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Gestion de clientes y contacto"
        icon={Users}
        actions={<Button onClick={openCreate} size="sm"><Plus className="size-3.5" />Nuevo Cliente</Button>}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <KpiCard label="Total Clientes" value={stats.total} />
        <KpiCard label="Con Compras" value={stats.withPurchases} />
        <KpiCard label="Total Vendido" value={`$${stats.totalSpent.toLocaleString()}`} />
      </div>

      {/* Split view: list + detail */}
      <div className="flex gap-0 rounded-lg border border-border-subtle bg-bg-surface overflow-hidden">
        {/* Left: Customer list */}
        <div className="w-[400px] shrink-0 border-r border-border-subtle">
          <Table
            columns={columns}
            data={customers}
            keyExtractor={c => String(c.id)}
            loading={loading}
            searchable
            searchPlaceholder="Buscar clientes..."
            emptyMessage="No hay clientes registrados"
            emptyIcon={Users}
            density="comfortable"
            onRowClick={c => setSelectedCustomer(c)}
            selected={selectedCustomer ? [String(selectedCustomer.id)] : []}
          />
        </div>

        {/* Right: Customer detail */}
        <div className="flex-1 p-6">
          {selectedCustomer ? (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="size-16 rounded-xl bg-bg-inset flex items-center justify-center">
                  <span className="text-2xl font-bold text-text-secondary">{selectedCustomer.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">{selectedCustomer.name}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    {selectedCustomer.email && <span className="text-sm text-text-secondary flex items-center gap-1"><Mail className="size-3" />{selectedCustomer.email}</span>}
                    {selectedCustomer.phone && <span className="text-sm text-text-secondary flex items-center gap-1"><Phone className="size-3" />{selectedCustomer.phone}</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <KpiCard label="Total Compras" value={selectedCustomer.total_purchases || 0} />
                <KpiCard label="Total Gastado" value={`$${(selectedCustomer.total_spent || 0).toLocaleString()}`} />
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => openEdit(selectedCustomer)}>
                  <Pencil className="size-3.5" /> Editar
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(selectedCustomer.id)}>
                  <Trash2 className="size-3.5" /> Eliminar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary py-12">
              <ShoppingBag className="size-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Selecciona un cliente para ver detalles</p>
            </div>
          )}
        </div>
      </div>

      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, customer: null })} title={editModal.customer ? 'Editar Cliente' : 'Nuevo Cliente'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Nombre</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Email</label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Telefono</label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setEditModal({ open: false, customer: null })}>Cancelar</Button>
            <Button type="submit" className="flex-1">{editModal.customer ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
