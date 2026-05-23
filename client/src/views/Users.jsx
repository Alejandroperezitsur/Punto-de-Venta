import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { Skeleton } from '../components/ui/Skeleton';
import { Table } from '../components/ui/Table';
import { Select } from '../components/ui/Select';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react';

const UsersView = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ username: '', password: '', role: 'cajero' });
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await api('/auth/users');
            setUsers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.username || (!editingId && !form.password)) {
            toast('Complete todos los campos requeridos', 'error');
            return;
        }
        setSaving(true);
        try {
            if (editingId) {
                await api(`/auth/users/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ role: form.role, password: form.password || undefined })
                });
            } else {
                await api('/auth/users', {
                    method: 'POST',
                    body: JSON.stringify(form)
                });
            }
            setForm({ username: '', password: '', role: 'cajero' });
            setEditingId(null);
            setShowForm(false);
            await loadUsers();
        } catch (e) {
            toast('Error: ' + e.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (user) => {
        setForm({ username: user.username, password: '', role: user.role });
        setEditingId(user.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este usuario?')) return;
        try {
            await api(`/auth/users/${id}`, { method: 'DELETE' });
            await loadUsers();
        } catch (e) {
            toast('Error: ' + e.message, 'error');
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
                <Button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ username: '', password: '', role: 'cajero' }); }}>
                    {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    {showForm ? 'Cancelar' : 'Nuevo Usuario'}
                </Button>
            </div>

            {showForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <Card className="p-6 border-l-4 border-l-primary">
                        <h3 className="font-semibold mb-4">{editingId ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h3>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="text-xs font-medium mb-1 block">Usuario</label>
                                <Input
                                    placeholder="nombre_usuario"
                                    value={form.username}
                                    onChange={e => setForm({ ...form, username: e.target.value })}
                                    disabled={!!editingId}
                                    required={!editingId}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block">Contraseña {editingId && '(dejar vacío para no cambiar)'}</label>
                                <Input
                                    type="password"
                                    placeholder={editingId ? '••••••••' : 'Contraseña'}
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    required={!editingId}
                                />
                            </div>
                            <div>
                                <Select options={[
                                    { value: 'cajero', label: 'Cajero' },
                                    { value: 'supervisor', label: 'Supervisor' },
                                    { value: 'admin', label: 'Administrador' }
                                ]} value={form.role} onChange={(v) => setForm({ ...form, role: v })} label="Rol" />
                            </div>
                            <Button type="submit" isLoading={saving}>
                                <Check className="h-4 w-4 mr-2" />
                                {editingId ? 'Guardar Cambios' : 'Crear Usuario'}
                            </Button>
                        </form>
                    </Card>
                </motion.div>
            )}

            <Card className="p-0 overflow-hidden">
                {loading ? (
                    <div className="p-8 space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex items-center gap-4 px-6">
                                <Skeleton className="size-10 rounded-full shrink-0" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-1/3" />
                                    <Skeleton className="h-3 w-1/5" />
                                </div>
                                <Skeleton className="h-8 w-20 rounded-md" />
                                <Skeleton className="h-8 w-16 rounded-md" />
                                <Skeleton className="size-8 rounded-md shrink-0" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <Table
                        columns={[
                            { key: 'username', title: 'Usuario', render: (row) => (
                                <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-sm">
                                        {row.username.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-medium">{row.username}</span>
                                </div>
                            )},
                            { key: 'role', title: 'Rol', render: (row) => <Badge variant={row.role === 'admin' ? 'danger' : row.role === 'supervisor' ? 'info' : 'success'}>{row.role === 'admin' ? 'Administrador' : row.role === 'supervisor' ? 'Supervisor' : 'Cajero'}</Badge> },
                            { key: 'active', title: 'Estado', render: (row) => <Badge variant={row.active !== 0 ? 'success' : 'neutral'} dot>{row.active !== 0 ? 'Activo' : 'Inactivo'}</Badge> },
                            { key: 'actions', title: 'Acciones', render: (row) => (
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>
                                        <Edit2 className="size-4" />
                                    </Button>
                                    {row.username !== 'admin' && (
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)} className="text-danger hover:bg-danger/10">
                                            <Trash2 className="size-4" />
                                        </Button>
                                    )}
                                </div>
                            )},
                        ]}
                        data={users}
                        loading={loading}
                        searchable
                        searchPlaceholder="Buscar usuarios..."
                    />
                )}
            </Card>
        </div>
    );
};

export default UsersView;
