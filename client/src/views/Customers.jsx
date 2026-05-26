import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { ErrorState } from '../components/ui/ErrorState';
import { Plus, Trash2, RefreshCw, Users, Phone, Mail, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CustomersView = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', rfc: '' });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
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

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar cliente?')) return;
    try {
      await api(`/customers/${id}`, { method: 'DELETE' });
      toast('Cliente eliminado', 'success');
      await loadCustomers();
    } catch { toast('Error al eliminar', 'error'); }
  };

  const columns = [
    { title: 'Nombre', key: 'name', sortable: true, className: 'font-semibold min-w-[180px]' },
    { title: 'Email', key: 'email', sortable: true, hideOnMobile: true, render: (row) =>
      row.email ? <span className="flex items-center gap-1.5"><Mail className="size-3.5 text-muted-foreground" />{row.email}</span> : '—'
    },
    { title: 'Teléfono', key: 'phone', render: (row) =>
      row.phone ? <span className="flex items-center gap-1.5"><Phone className="size-3.5 text-muted-foreground" />{row.phone}</span> : '—'
    },
    { title: 'RFC', key: 'rfc', hideOnMobile: true },
    { title: 'Acciones', key: 'actions', width: '80px', render: (row) => (
      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }}
        className="text-danger hover:bg-danger/10 rounded-xl">
        <Trash2 className="size-4" />
      </Button>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">Clientes</h1>
          <p className="text-muted-foreground font-medium text-sm">
            {customers.length > 0 ? `${customers.length} registrados` : 'Gestiona tus clientes'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" size="icon" onClick={loadCustomers} isLoading={loading} className="rounded-2xl border border-border">
            <RefreshCw className="size-5" />
          </Button>
          <Button onClick={() => setShowForm(!showForm)} size="lg" className="font-bold shadow-lg shadow-primary/20">
            <Plus className="size-5 mr-1" /> Nuevo Cliente
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-6 mb-6 border-2 border-primary/20">
              <h3 className="text-lg font-bold mb-4">Registrar Cliente</h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
                <div className="flex gap-3 justify-end md:col-span-2">
                  <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
                  <Button type="submit" isLoading={saving} disabled={!form.name.trim()} className="font-bold">
                    <Plus className="size-4 mr-1" /> Registrar
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {error ? (
        <ErrorState error={error.message || error} onRetry={loadCustomers} />
      ) : (
        <Table
          columns={columns}
          data={customers}
          searchable
          searchPlaceholder="Buscar clientes..."
          pageSize={15}
          density="comfortable"
          loading={loading}
          emptyIcon={Users}
          emptyTitle="No hay clientes"
          emptyDescription="Registra tu primer cliente para comenzar"
          emptyAction={{ label: 'Crear Cliente', onClick: () => setShowForm(true) }}
        />
      )}
    </div>
  );
};

export default CustomersView;
