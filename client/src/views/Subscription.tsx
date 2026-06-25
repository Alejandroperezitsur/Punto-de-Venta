import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CreditCard, Check } from 'lucide-react';

const plans = [
  { id: 'free', name: 'Gratuito', price: '$0', features: ['Hasta 100 productos', '1 usuario', 'Ventas basicas', 'Soporte comunitario'], cta: 'Actual', active: true },
  { id: 'pro', name: 'Profesional', price: '$29/mes', features: ['Productos ilimitados', '5 usuarios', 'Reportes avanzados', 'Soporte prioritario', 'Backups automaticos'], cta: 'Actualizar', active: false },
];

export default function SubscriptionView() {
  return (
    <div>
      <PageHeader title="Facturacion" description="Gestiona tu plan y suscripcion" icon={CreditCard} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
        {plans.map(plan => (
          <Card key={plan.id} className={plan.active ? 'border-accent/30' : ''}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-text-primary">{plan.name}</h3>
                <p className="text-[var(--text-display)] font-bold text-text-primary">{plan.price}</p>
              </div>
              {plan.active && <Badge variant="accent" size="xs">Actual</Badge>}
            </div>
            <ul className="space-y-2 mb-4">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                  <Check className="size-3.5 text-success" /> {f}
                </li>
              ))}
            </ul>
            <Button variant={plan.active ? 'secondary' : 'primary'} className="w-full" disabled={plan.active} size="sm">
              {plan.cta}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
