import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function SupportTickets() {
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
            alert('Error creando ticket');
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
                <table className="table w-full">
                    <thead>
                        <tr>
                            <th className="text-left bg-gray-50 p-4">Asunto</th>
                            <th className="text-left bg-gray-50 p-4">Estado</th>
                            <th className="text-left bg-gray-50 p-4">Fecha</th>
                            <th className="text-left bg-gray-50 p-4">Mensajes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tickets.map(t => (
                            <tr key={t.id} className="border-t">
                                <td className="p-4 font-medium">{t.subject}</td>
                                <td className="p-4"><span className={`badge ${t.status === 'open' ? 'badge-primary' : 'badge-accent'}`}>{t.status}</span></td>
                                <td className="p-4 text-gray-500 text-sm">{new Date(t.created_at).toLocaleDateString()}</td>
                                <td className="p-4">{t.messages.length}</td>
                            </tr>
                        ))}
                        {tickets.length === 0 && (
                            <tr><td colSpan="4" className="p-8 text-center text-gray-400">No hay tickets de soporte.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
