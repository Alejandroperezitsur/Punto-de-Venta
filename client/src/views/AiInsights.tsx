import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Brain, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';

const InsightCard = ({ title, description, icon: Icon }: { title: string; description: string; icon: React.ElementType }) => (
  <Card className="flex items-start gap-4">
    <div className="size-10 rounded-lg bg-accent-bg flex items-center justify-center shrink-0">
      <Icon className="size-5 text-accent-text" />
    </div>
    <div>
      <h3 className="font-semibold text-sm text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-secondary">{description}</p>
    </div>
  </Card>
);

export default function AiInsights() {
  return (
    <div>
      <PageHeader title="Insights" description="Analisis inteligente de tu negocio" icon={Brain} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InsightCard icon={TrendingUp} title="Tendencia de Ventas" description="Las ventas han aumentado 15% esta semana. El mejor dia es sabado." />
        <InsightCard icon={AlertTriangle} title="Alerta de Stock" description="3 productos estan por debajo del nivel minimo recomendado." />
        <InsightCard icon={Lightbulb} title="Sugerencia" description="Considera hacer pedido de los productos mas vendidos." />
        <InsightCard icon={TrendingUp} title="Producto Estrella" description="El producto mas vendido este mes representa el 22% de ingresos." />
      </div>
    </div>
  );
}
