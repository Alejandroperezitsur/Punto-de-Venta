import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Table } from '../components/common/Table';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card } from '../components/common/Card';
import { Plus, Trash2, RefreshCw } from 'lucide-react';

const CustomersView = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', phone: '', rfc: '' });
    const [saving, setSaving] = useState(false);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const data = await api('/customers');
            setCustomers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCustomers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api('/customers', {
                method: 'POST',
                body: JSON.stringify(form)
            });
            setForm({ name: '', email: '', phone: '', rfc: '' });
            await loadCustomers();
        } catch (e) {
            alert('Error al guardar: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar cliente?')) return;
        try {
            await api(`/customers/${id}`, { method: 'DELETE' });
            await loadCustomers();
        } catch (e) {
            alert('Error al eliminar');
        }
    };

    const columns = [
        { title: 'ID', key: 'id', className: 'w-20' },
        { title: 'Nombre', key: 'name', className: 'font-medium' },
        { title: 'Email', key: 'email' },
        { title: 'Teléfono', key: 'phone' },
        { title: 'RFC', key: 'rfc' },
        {
            title: 'Acciones', key: 'actions', render: (row) => (
                <Button variant="danger" size="icon" onClick={() => handleDelete(row.id)} className="h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                </Button>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Clientes</h1>
                <Button variant="ghost" onClick={loadCustomers} isLoading={loading}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
                </Button>
            </div>

            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Nuevo Cliente</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="md:col-span-2">
                        <Input
                            placeholder="Nombre completo"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <Input
                            placeholder="Email"
                            type="email"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <Input
                            placeholder="Teléfono"
                            value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                        />
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Input
                                placeholder="RFC"
                                value={form.rfc}
                                onChange={e => setForm({ ...form, rfc: e.target.value })}
                            />
                        </div>
                        <Button type="submit" isLoading={saving}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </form>
            </Card>

            <Table
                columns={columns}
                data={customers}
                searchPlaceholder="Buscar cliente..."
            />
        </div>
    );
};

export default CustomersView;
