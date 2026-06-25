import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ClipboardList, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function SupportTickets() {
  const tickets = [
    { id: 1, title: 'Error al imprimir ticket', status: 'open', priority: 'high', date: '2026-06-20' },
    { id: 2, title: 'Producto no aparece en busqueda', status: 'in_progress', priority: 'medium', date: '2026-06-19' },
    { id: 3, title: 'Sugerencia: Modo oscuro automatico', status: 'resolved', priority: 'low', date: '2026-06-15' },
  ];

  const statusIcons: Record<string, React.ElementType> = { open: AlertCircle, in_progress: Clock, resolved: CheckCircle };
  const statusColors: Record<string, 'danger' | 'warning' | 'success'> = { open: 'danger', in_progress: 'warning', resolved: 'success' };

  return (
    <div>
      <PageHeader title="Soporte" description="Tickets de soporte tecnico" icon={ClipboardList} />
      <div className="space-y-3">
        {tickets.map(t => {
          const Icon = statusIcons[t.status];
          return (
            <Card key={t.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Icon className={`size-5 mt-0.5 ${t.status === 'open' ? 'text-danger' : t.status === 'in_progress' ? 'text-warning' : 'text-success'}`} />
                  <div>
                    <h3 className="font-semibold text-sm text-text-primary">{t.title}</h3>
                    <p className="text-xs text-text-tertiary mt-1">#{t.id} · {t.date}</p>
                  </div>
                </div>
                <Badge variant={statusColors[t.status]} size="xs">
                  {t.status === 'open' ? 'Abierto' : t.status === 'in_progress' ? 'En Proceso' : 'Resuelto'}
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
