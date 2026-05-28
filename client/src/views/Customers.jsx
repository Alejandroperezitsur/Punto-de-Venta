import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { ConfirmModal } from '../components/sales/ConfirmModal';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { ErrorState } from '../components/ui/ErrorState';
import { Plus, Trash2, RefreshCw, Users, Phone, Mail, FileText } from 'lucide-react';
import { ViewContainer } from '../components/layout/ViewContainer';
import { ViewHeader } from '../components/layout/ViewHeader';
import { cn } from '../utils/cn';

const CustomersView = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', rfc: '' });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const deleteDialog = useConfirmDialog();
  const toast = useToast();

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api('/customers');
      setCustomers(data);
    } catch (e) {
      setError(e);
      toast('Error al cargar clientes', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadCustomers(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/customers', { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', email: '', phone: '', rfc: '' });
      setShowForm(false);
      toast('Cliente creado', 'success');
      await loadCustomers();
    } catch (e) {
      toast('Error al guardar: ' + e.message, 'error');
    } finally { setSaving(false); }
  };

  const handleDeleteRequest = (id) => {
    deleteDialog.open(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.target) return;
    try {
      await api(`/customers/${deleteDialog.target}`, { method: 'DELETE' });
      toast('Cliente eliminado', 'success');
      await loadCustomers();
    } catch { toast('Error al eliminar', 'error'); }
    finally { deleteDialog.close(); }
  };

  const columns = [
    { title: 'Nombre', key: 'name', sortable: true, className: 'font-semibold min-w-[160px]' },
    { title: 'Email', key: 'email', sortable: true, hideOnMobile: true, render: (row) =>
      row.email ? <span className="flex items-center gap-1"><Mail className="size-3 text-muted-foreground" />{row.email}</span> : '—'
    },
    { title: 'Teléfono', key: 'phone', render: (row) =>
      row.phone ? <span className="flex items-center gap-1"><Phone className="size-3 text-muted-foreground" />{row.phone}</span> : '—'
    },
    { title: 'RFC', key: 'rfc', hideOnMobile: true },
    { title: '', key: 'actions', width: '48px', render: (row) => (
      <button onClick={(e) => { e.stopPropagation(); handleDeleteRequest(row.id); }}
        className="size-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors touch-target"
        aria-label="Eliminar cliente">
        <Trash2 className="size-3.5" />
      </button>
    )},
  ];

  return (
    <ViewContainer>
      <ViewHeader
        title="Clientes"
        description={customers.length > 0 ? `${customers.length} registrados` : 'Gestiona tus clientes'}
      >
        <Button variant="ghost" size="icon" onClick={loadCustomers} isLoading={loading} className="rounded-md border border-border">
          <RefreshCw className="size-4" />
        </Button>
        <Button onClick={() => setShowForm(!showForm)} size="md" className="font-bold">
          <Plus className="size-4 mr-1" /> Nuevo Cliente
        </Button>
      </ViewHeader>

      {showForm && (
        <Card className="p-4 border border-primary/20">
          <h3 className="text-sm font-bold mb-3">Registrar Cliente</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-2">
              <Input placeholder="Nombre completo" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} required label="Nombre" />
            </div>
            <div>
              <Input placeholder="cliente@email.com" type="email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} label="Email" />
            </div>
            <div>
              <Input placeholder="+52 555 123 4567" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })} label="Teléfono" />
            </div>
            <div className="md:col-span-2">
              <Input placeholder="RFC (opcional)" value={form.rfc}
                onChange={e => setForm({ ...form, rfc: e.target.value })} label="RFC" />
            </div>
            <div className="flex gap-2 justify-end md:col-span-2">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)} size="sm">Cancelar</Button>
              <Button type="submit" isLoading={saving} disabled={!form.name.trim()} className="font-bold" size="sm">
                <Plus className="size-3.5 mr-1" /> Registrar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {error ? (
        <ErrorState error={error.message || error} onRetry={loadCustomers} />
      ) : (
        <Table
          columns={columns}
          data={customers}
          searchable
          searchPlaceholder="Buscar clientes..."
          pageSize={15}
          density="compact"
          loading={loading}
          emptyIcon={Users}
          emptyTitle="No hay clientes"
          emptyDescription="Registra tu primer cliente para comenzar"
          emptyAction={{ label: 'Crear Cliente', onClick: () => setShowForm(true) }}
        />
      )}

      <ConfirmModal
        open={deleteDialog.isOpen}
        title="Eliminar Cliente"
        message="¿Estás seguro de eliminar este cliente? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={deleteDialog.close}
      />
    </ViewContainer>
  );
};

export default CustomersView;
