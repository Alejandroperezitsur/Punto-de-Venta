import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { formatMoney } from '../utils/format';
import { Plus, Trash2, Edit2, Shield, User, UserCheck, X, Check } from 'lucide-react';

const UsersView = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ username: '', password: '', role: 'cajero' });
    const [saving, setSaving] = useState(false);

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
            alert('Complete todos los campos requeridos');
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
            alert('Error: ' + e.message);
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
            alert('Error: ' + e.message);
        }
    };

    const getRoleBadge = (role) => {
        const styles = {
            admin: 'bg-red-100 text-red-700 border-red-200',
            supervisor: 'bg-blue-100 text-blue-700 border-blue-200',
            cajero: 'bg-green-100 text-green-700 border-green-200',
        };
        const labels = { admin: 'Administrador', supervisor: 'Supervisor', cajero: 'Cajero' };
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${styles[role] || 'bg-gray-100'}`}>
                <Shield className="h-3 w-3" />
                {labels[role] || role}
            </span>
        );
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
                <Card className="p-6 animate-fade-in border-l-4 border-l-[hsl(var(--primary))]">
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
                            <label className="text-xs font-medium mb-1 block">Rol</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-[hsl(var(--border))] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                                value={form.role}
                                onChange={e => setForm({ ...form, role: e.target.value })}
                            >
                                <option value="cajero">Cajero</option>
                                <option value="supervisor">Supervisor</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>
                        <Button type="submit" isLoading={saving}>
                            <Check className="h-4 w-4 mr-2" />
                            {editingId ? 'Guardar Cambios' : 'Crear Usuario'}
                        </Button>
                    </form>
                </Card>
            )}

            <Card className="p-0 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">Cargando usuarios...</div>
                ) : users.length === 0 ? (
                    <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">No hay usuarios</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-[hsl(var(--muted))]">
                            <tr>
                                <th className="text-left px-6 py-3 font-medium">Usuario</th>
                                <th className="text-left px-6 py-3 font-medium">Rol</th>
                                <th className="text-left px-6 py-3 font-medium">Estado</th>
                                <th className="text-right px-6 py-3 font-medium">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[hsl(var(--border))]">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-[hsl(var(--muted))/0.5]">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                                {u.username.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium">{u.username}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${u.active !== 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {u.active !== 0 ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(u)} className="h-8 w-8">
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            {u.username !== 'admin' && (
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)} className="h-8 w-8 text-red-500 hover:bg-red-50">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>
        </div>
    );
};

export default UsersView;
