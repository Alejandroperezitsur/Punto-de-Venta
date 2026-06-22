import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { useToast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { ViewContainer } from '../components/layout/ViewContainer';
import { ViewHeader } from '../components/layout/ViewHeader';
import { Headphones, Plus, X } from 'lucide-react';

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
        <ViewContainer>
            <ViewHeader title="Soporte Técnico" icon={<Headphones className="size-5 text-primary" />}>
                <Button onClick={() => setNewTicket(!newTicket)} size="sm">
                    {newTicket ? <X className="size-4 mr-1" /> : <Plus className="size-4 mr-1" />}
                    {newTicket ? 'Cancelar' : 'Nuevo Ticket'}
                </Button>
            </ViewHeader>

            {newTicket && (
                <Card className="p-6 rounded-2xl backdrop-blur-md bg-surface-glass/50 border border-border/20 relative overflow-hidden mb-6">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-primary/40" />
                    <h3 className="font-bold mb-4">Crear Ticket</h3>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Asunto</label>
                            <Input value={subject} onChange={e => setSubject(e.target.value)} required placeholder="Describe tu problema" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Mensaje</label>
                            <textarea className="w-full p-3 rounded-xl border border-border/30 bg-background/50 text-sm focus:outline-none focus:border-primary/40 transition-colors min-h-[100px]" value={message} onChange={e => setMessage(e.target.value)} required />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setNewTicket(false)}>Cancelar</Button>
                            <Button type="submit">Enviar</Button>
                        </div>
                    </form>
                </Card>
            )}

            <Card className="p-0 overflow-hidden rounded-2xl backdrop-blur-md bg-surface-glass/50 border border-border/20">
                <Table
                    data={tickets}
                    searchable={false}
                    pageSize={tickets.length || 10}
                    striped={false}
                    density="compact"
                    emptyTitle="No hay tickets de soporte."
                    columns={[
                        { key: 'subject', label: 'Asunto', render: (t) => <span className="font-medium">{t.subject}</span> },
                        { key: 'status', label: 'Estado', render: (t) => (
                            <Badge variant={t.status === 'open' ? 'info' : 'success'} size="sm">
                                {t.status}
                            </Badge>
                        )},
                        { key: 'created_at', label: 'Fecha', render: (t) => <span className="text-muted-foreground text-sm">{new Date(t.created_at).toLocaleDateString()}</span> },
                        { key: 'messages', label: 'Mensajes', render: (t) => t.messages.length },
                    ]}
                    rowKey={(t) => t.id}
                />
            </Card>
        </ViewContainer>
    );
}
