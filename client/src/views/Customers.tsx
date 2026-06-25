import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
    } catch { toast(t('customers.loadError'), 'error'); }
    finally { setLoading(false); }
  }, [toast, t]);

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
        toast(t('customers.updated'), 'success');
      } else {
        await api('/customers', { method: 'POST', body: JSON.stringify(payload) });
        toast(t('customers.created'), 'success');
      }
      setEditModal({ open: false, customer: null });
      load();
    } catch { toast(t('customers.saveError'), 'error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('customers.confirmDelete'))) return;
    try { await api(`/customers/${id}`, { method: 'DELETE' }); toast(t('customers.deleted'), 'success'); load(); setSelectedCustomer(null); }
    catch { toast(t('customers.deleteError'), 'error'); }
  };

  const stats = useMemo(() => {
    const total = customers.length;
    const withPurchases = customers.filter(c => (c.total_purchases || 0) > 0).length;
    const totalSpent = customers.reduce((acc, c) => acc + (c.total_spent || 0), 0);
    return { total, withPurchases, totalSpent };
  }, [customers]);

  const columns: Column<Customer>[] = useMemo(() => [
    { key: 'name', label: t('customers.customer'), render: c => (
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
    { key: 'phone', label: t('customers.phone'), hideOnMobile: true, render: c => c.phone || <span className="text-text-disabled">-</span> },
    { key: 'total_purchases', label: t('customers.purchases'), render: c => <span className="font-semibold tabular-nums">{c.total_purchases || 0}</span> },
    { key: 'actions', label: '', render: c => (
      <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
        <button onClick={() => openEdit(c)} className="size-8 rounded-md flex items-center justify-center text-text-tertiary hover:text-accent hover:bg-accent-bg transition-colors" aria-label={t('customers.edit')}><Pencil className="size-3.5" /></button>
        <button onClick={() => handleDelete(c.id)} className="size-8 rounded-md flex items-center justify-center text-text-tertiary hover:text-danger hover:bg-danger-bg transition-colors" aria-label={t('customers.delete')}><Trash2 className="size-3.5" /></button>
      </div>
    ), className: 'w-[80px] text-right' },
  ], [t]);

  return (
    <div>
      <PageHeader title={t('customers.title')} description={t('customers.description')} icon={Users}
        actions={<Button onClick={openCreate} size="sm"><Plus className="size-3.5" />{t('customers.newCustomer')}</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <KpiCard label={t('customers.totalCustomers')} value={stats.total} />
        <KpiCard label={t('customers.withPurchases')} value={stats.withPurchases} />
        <KpiCard label={t('customers.totalSold')} value={`$${stats.totalSpent.toLocaleString()}`} />
      </div>
      <div className="flex gap-0 rounded-lg border border-border-subtle bg-bg-surface overflow-hidden">
        <div className="w-[400px] shrink-0 border-r border-border-subtle">
          <Table columns={columns} data={customers} keyExtractor={c => String(c.id)} loading={loading} searchable
            searchPlaceholder={t('customers.searchPlaceholder')} emptyMessage={t('customers.noCustomers')} emptyIcon={Users}
            density="comfortable" onRowClick={c => setSelectedCustomer(c)} selected={selectedCustomer ? [String(selectedCustomer.id)] : []} />
        </div>
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
                <KpiCard label={t('customers.totalPurchases')} value={selectedCustomer.total_purchases || 0} />
                <KpiCard label={t('customers.totalSpent')} value={`$${(selectedCustomer.total_spent || 0).toLocaleString()}`} />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => openEdit(selectedCustomer)}><Pencil className="size-3.5" /> {t('customers.edit')}</Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(selectedCustomer.id)}><Trash2 className="size-3.5" /> {t('customers.delete')}</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary py-12">
              <ShoppingBag className="size-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">{t('customers.selectCustomer')}</p>
            </div>
          )}
        </div>
      </div>
      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, customer: null })} title={editModal.customer ? t('customers.editCustomer') : t('customers.newCustomer')} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1"><label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">{t('customers.name')}</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus /></div>
          <div className="space-y-1"><label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">{t('customers.email')}</label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div className="space-y-1"><label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">{t('customers.phone')}</label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setEditModal({ open: false, customer: null })}>{t('common.cancel')}</Button>
            <Button type="submit" className="flex-1">{editModal.customer ? t('common.save') : t('common.create')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
