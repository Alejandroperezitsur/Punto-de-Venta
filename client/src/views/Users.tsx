import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Column } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import { api } from '../lib/api';
import { Shield, Plus, Pencil, Trash2 } from 'lucide-react';

export default function UsersView() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<{ open: boolean; user: any | null }>({ open: false, user: null });
  const [form, setForm] = useState({ username: '', password: '', role: 'cajero' });
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/users');
      setUsers(Array.isArray(data) ? data : data.data || []);
    } catch { toast('Error al cargar usuarios', 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ username: '', password: '', role: 'cajero' });
    setEditModal({ open: true, user: null });
  };

  const openEdit = (u: any) => {
    setForm({ username: u.username, password: '', role: u.role || 'cajero' });
    setEditModal({ open: true, user: u });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { username: form.username, role: form.role };
      if (form.password) payload.password = form.password;
      if (editModal.user) {
        await api(`/users/${editModal.user.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast('Usuario actualizado', 'success');
      } else {
        await api('/users', { method: 'POST', body: JSON.stringify(payload) });
        toast('Usuario creado', 'success');
      }
      setEditModal({ open: false, user: null });
      load();
    } catch { toast('Error al guardar', 'error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Eliminar este usuario?')) return;
    try { await api(`/users/${id}`, { method: 'DELETE' }); toast('Usuario eliminado', 'success'); load(); }
    catch { toast('Error al eliminar', 'error'); }
  };

  const roleVariant = (role: string) => {
    if (role === 'admin') return 'danger';
    if (role === 'supervisor') return 'warning';
    return 'success';
  };

  const columns: Column<any>[] = useMemo(() => [
    { key: 'username', label: 'Usuario', render: u => <span className="font-semibold text-sm">{u.username}</span> },
    { key: 'role', label: 'Rol', render: u => <Badge variant={roleVariant(u.role)} size="xs">{u.role}</Badge> },
    { key: 'created_at', label: 'Creado', hideOnMobile: true, render: u => u.created_at ? new Date(u.created_at).toLocaleDateString() : '-' },
    { key: 'actions', label: '', render: u => (
      <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
        <button onClick={() => openEdit(u)} className="size-8 rounded-md flex items-center justify-center text-text-tertiary hover:text-accent hover:bg-accent-bg transition-colors" aria-label="Editar"><Pencil className="size-3.5" /></button>
        <button onClick={() => handleDelete(u.id)} className="size-8 rounded-md flex items-center justify-center text-text-tertiary hover:text-danger hover:bg-danger-bg transition-colors" aria-label="Eliminar"><Trash2 className="size-3.5" /></button>
      </div>
    ), className: 'w-[80px] text-right' },
  ], []);

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Gestion de cuentas de acceso al sistema"
        icon={Shield}
        actions={<Button onClick={openCreate} size="sm"><Plus className="size-3.5" />Nuevo Usuario</Button>}
      />
      <Table
        columns={columns}
        data={users}
        keyExtractor={u => String(u.id)}
        loading={loading}
        searchable
        searchPlaceholder="Buscar usuarios..."
        emptyMessage="No hay usuarios registrados"
        density="comfortable"
      />
      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, user: null })} title={editModal.user ? 'Editar Usuario' : 'Nuevo Usuario'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Usuario</label>
            <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required autoFocus />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Contrasena {editModal.user && '(dejar vacia para no cambiar)'}</label>
            <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={!editModal.user} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Rol</label>
            <Select
              value={form.role}
              onChange={v => setForm(f => ({ ...f, role: v }))}
              options={[
                { value: 'admin', label: 'Administrador' },
                { value: 'supervisor', label: 'Supervisor' },
                { value: 'cajero', label: 'Cajero' },
              ]}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setEditModal({ open: false, user: null })}>Cancelar</Button>
            <Button type="submit" className="flex-1">{editModal.user ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
