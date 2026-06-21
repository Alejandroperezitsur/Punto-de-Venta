import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { KpiCard } from '../components/ui/KpiCard';
import { ConfirmModal } from '../components/sales/ConfirmModal';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { ErrorState } from '../components/ui/ErrorState';
import { Plus, Trash2, RefreshCw, Users, Phone, Mail, UserPlus, TrendingUp } from 'lucide-react';
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

  const getAvatarColor = (name) => {
    const colors = [
      'from-blue-500 to-blue-600', 'from-emerald-500 to-emerald-600',
      'from-violet-500 to-violet-600', 'from-amber-500 to-amber-600',
      'from-rose-500 to-rose-600', 'from-cyan-500 to-cyan-600',
    ];
    const idx = (name || '').charCodeAt(0) % colors.length;
    return colors[idx];
  };

  const columns = [
    { title: 'Nombre', key: 'name', sortable: true, className: 'font-semibold min-w-[160px]', render: (row) => (
      <div className="flex items-center gap-3">
        <div className={cn('size-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs shrink-0', getAvatarColor(row.name))}>
          {(row.name || '?').charAt(0).toUpperCase()}
        </div>
        <span>{row.name}</span>
      </div>
    )},
    { title: 'Email', key: 'email', sortable: true, hideOnMobile: true, render: (row) =>
      row.email ? <span className="flex items-center gap-1.5 text-muted-foreground"><Mail className="size-3 text-muted-foreground/60" />{row.email}</span> : <span className="text-muted-foreground/40">—</span>
    },
    { title: 'Teléfono', key: 'phone', render: (row) =>
      row.phone ? <span className="flex items-center gap-1.5 text-muted-foreground"><Phone className="size-3 text-muted-foreground/60" />{row.phone}</span> : <span className="text-muted-foreground/40">—</span>
    },
    { title: 'RFC', key: 'rfc', hideOnMobile: true, render: (row) => row.rfc || <span className="text-muted-foreground/40">—</span> },
    { title: '', key: 'actions', width: '48px', render: (row) => (
      <button onClick={(e) => { e.stopPropagation(); handleDeleteRequest(row.id); }}
        className="size-8 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-danger hover:bg-danger/10 transition-all duration-200 touch-target opacity-0 group-hover:opacity-100"
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
        icon={<Users className="size-5 text-primary" />}
      >
        <Button variant="ghost" size="icon" onClick={loadCustomers} isLoading={loading} className="rounded-lg border border-border/30">
          <RefreshCw className="size-4" />
        </Button>
        <Button onClick={() => setShowForm(!showForm)} size="md" className="font-bold">
          <Plus className="size-4 mr-1" /> Nuevo Cliente
        </Button>
      </ViewHeader>

      {/* Stats Row */}
      {customers.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KpiCard label="Total Clientes" value={customers.length} icon={Users} iconColor="primary" />
          <KpiCard label="Con Email" value={customers.filter(c => c.email).length} icon={Mail} iconColor="info" />
          <KpiCard label="Con Teléfono" value={customers.filter(c => c.phone).length} icon={Phone} iconColor="success" className="hidden md:flex" />
        </div>
      )}

      {showForm && (
        <Card variant="glass" className="p-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-primary/40" />
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserPlus className="size-3.5 text-primary" />
            </div>
            Registrar Cliente
          </h3>
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
