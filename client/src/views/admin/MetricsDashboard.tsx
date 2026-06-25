import React from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { KpiCard } from '../../components/ui/KpiCard';
import { Card } from '../../components/ui/Card';
import { BarChart3, Store, Users, AlertTriangle } from 'lucide-react';

export default function MetricsDashboard() {
  return (
    <div>
      <PageHeader title="Metricas" description="Panel de administracion SaaS" icon={BarChart3} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Tiendas Activas" value="12" />
        <KpiCard label="Usuarios Totales" value="48" trend={{ value: 5, positive: true }} />
        <KpiCard label="Ventas Hoy" value="$4,250" trend={{ value: 12, positive: true }} />
        <KpiCard label="Errores (24h)" value="3" />
      </div>
      <Card>
        <h3 className="font-bold text-sm text-text-primary mb-4">Eventos Recientes</h3>
        <div className="space-y-2 text-sm text-text-secondary">
          <p>Store #3 - Nueva venta registrada - hace 5 min</p>
          <p>Store #7 - Caja cerrada correctamente - hace 23 min</p>
          <p>Store #1 - Usuario "cajero1" inicio sesion - hace 1 hora</p>
        </div>
      </Card>
    </div>
  );
}
