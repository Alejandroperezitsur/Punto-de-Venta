import React from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { KpiCard } from '../../components/ui/KpiCard';
import { Card } from '../../components/ui/Card';
import { FileText } from 'lucide-react';

export default function EnterpriseReports() {
  return (
    <div>
      <PageHeader title="Reportes Enterprise" description="Analitica avanzada multi-tienda" icon={FileText} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <KpiCard label="Ingresos Totales" value="$128,450" trend={{ value: 22, positive: true }} />
        <KpiCard label="Transacciones" value="3,421" trend={{ value: 8, positive: true }} />
        <KpiCard label="Ticket Promedio Global" value="$37.55" />
      </div>
      <Card>
        <h3 className="font-bold text-sm text-text-primary mb-4">Comparativa por Tienda</h3>
        <div className="space-y-3">
          {['Sucursal Centro', 'Sucursal Norte', 'Sucursal Sur'].map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-sm font-semibold text-text-primary w-40">{s}</span>
              <div className="flex-1 h-2 rounded-full bg-bg-inset overflow-hidden">
                <div className="h-full rounded-full bg-accent" style={{ width: `${100 - i * 25}%` }} />
              </div>
              <span className="text-sm font-bold text-text-primary tabular-nums">${(45000 - i * 12000).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
