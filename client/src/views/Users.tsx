import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
    } catch { toast(t('users.loadError'), 'error'); }
    finally { setLoading(false); }
  }, [toast, t]);

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
        toast(t('users.updated'), 'success');
      } else {
        await api('/users', { method: 'POST', body: JSON.stringify(payload) });
        toast(t('users.created'), 'success');
      }
      setEditModal({ open: false, user: null });
      load();
    } catch { toast(t('users.saveError'), 'error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('users.confirmDelete'))) return;
    try { await api(`/users/${id}`, { method: 'DELETE' }); toast(t('users.deleted'), 'success'); load(); }
    catch { toast(t('users.deleteError'), 'error'); }
  };

  const roleVariant = (role: string) => { if (role === 'admin') return 'danger'; if (role === 'supervisor') return 'warning'; return 'success'; };

  const columns: Column<any>[] = useMemo(() => [
    { key: 'username', label: t('users.user'), render: u => <span className="font-semibold text-sm">{u.username}</span> },
    { key: 'role', label: t('users.role'), render: u => <Badge variant={roleVariant(u.role)} size="xs">{u.role}</Badge> },
    { key: 'created_at', label: t('common.create'), hideOnMobile: true, render: u => u.created_at ? new Date(u.created_at).toLocaleDateString() : '-' },
    { key: 'actions', label: '', render: u => (
      <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
        <button onClick={() => openEdit(u)} className="size-8 rounded-md flex items-center justify-center text-text-tertiary hover:text-accent hover:bg-accent-bg transition-colors" aria-label={t('users.edit')}><Pencil className="size-3.5" /></button>
        <button onClick={() => handleDelete(u.id)} className="size-8 rounded-md flex items-center justify-center text-text-tertiary hover:text-danger hover:bg-danger-bg transition-colors" aria-label={t('users.delete')}><Trash2 className="size-3.5" /></button>
      </div>
    ), className: 'w-[80px] text-right' },
  ], [t]);

  return (
    <div>
      <PageHeader title={t('users.title')} description={t('users.description')} icon={Shield}
        actions={<Button onClick={openCreate} size="sm"><Plus className="size-3.5" />{t('users.newUser')}</Button>} />
      <Table columns={columns} data={users} keyExtractor={u => String(u.id)} loading={loading} searchable
        searchPlaceholder={t('users.searchPlaceholder')} emptyMessage={t('users.noUsers')} density="comfortable" />
      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, user: null })} title={editModal.user ? t('users.editUser') : t('users.newUser')} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1"><label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">{t('users.user')}</label>
            <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required autoFocus /></div>
          <div className="space-y-1"><label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">{t('users.password')} {editModal.user && t('users.passwordHint')}</label>
            <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={!editModal.user} /></div>
          <div className="space-y-1"><label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">{t('users.role')}</label>
            <Select value={form.role} onChange={v => setForm(f => ({ ...f, role: v }))}
              options={[{ value: 'admin', label: t('users.admin') },{ value: 'supervisor', label: t('users.supervisor') },{ value: 'cajero', label: t('users.cashier') }]} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={() => setEditModal({ open: false, user: null })}>{t('common.cancel')}</Button>
            <Button type="submit" className="flex-1">{editModal.user ? t('common.save') : t('common.create')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
