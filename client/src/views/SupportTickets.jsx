import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Table } from '../components/ui/Table';
import { useToast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';

export default function SupportTickets() {
    const toast = useToast();
    const [tickets, setTickets] = useState([]);
    const [newTicket, setNewTicket] = useState(false);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadTickets();
    }, []);

    const loadTickets = () => api('/support').then(setTickets).catch(() => { });

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api('/support', {
                method: 'POST',
                body: JSON.stringify({ subject, message, priority: 'normal' })
            });
            setNewTicket(false);
            setSubject('');
            setMessage('');
            loadTickets();
        } catch (e) {
            toast('Error creando ticket', 'error');
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Soporte Técnico</h1>
                <button onClick={() => setNewTicket(true)} className="btn btn-primary">
                    + Nuevo Ticket
                </button>
            </div>

            {newTicket && (
                <div className="bg-white p-6 rounded shadow mb-6 border animate-fadeUp">
                    <h3 className="font-bold mb-4">Crear Ticket</h3>
                    <form onSubmit={handleCreate}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Asunto</label>
                            <input className="input w-full border p-2 rounded" value={subject} onChange={e => setSubject(e.target.value)} required />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Mensaje</label>
                            <textarea className="input w-full border p-2 rounded" rows="4" value={message} onChange={e => setMessage(e.target.value)} required ></textarea>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setNewTicket(false)} className="btn btn-ghost">Cancelar</button>
                            <button type="submit" className="btn btn-primary">Enviar</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded shadow overflow-hidden">
                <Table
                    data={tickets}
                    searchable={false}
                    pageSize={tickets.length || 10}
                    striped={false}
                    density="compact"
                    emptyTitle="No hay tickets de soporte."
                    columns={[
                        { key: 'subject', title: 'Asunto', render: (t) => <span className="font-medium">{t.subject}</span> },
                        { key: 'status', title: 'Estado', render: (t) => (
                            <Badge variant={t.status === 'open' ? 'info' : 'success'} size="sm">
                                {t.status}
                            </Badge>
                        )},
                        { key: 'created_at', title: 'Fecha', render: (t) => <span className="text-gray-500 text-sm">{new Date(t.created_at).toLocaleDateString()}</span> },
                        { key: 'messages', title: 'Mensajes', render: (t) => t.messages.length },
                    ]}
                    rowKey={(t) => t.id}
                />
            </div>
        </div>
    );
}
