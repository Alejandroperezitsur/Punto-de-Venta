import React from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ViewContainer } from '../../components/layout/ViewContainer';
import { ViewHeader } from '../../components/layout/ViewHeader';
import { Building2 } from 'lucide-react';

export default function EnterpriseReports() {
    return (
        <ViewContainer>
            <ViewHeader title="Reportes Enterprise" icon={<Building2 className="size-5 text-primary" />}
                description="Consolidado de múltiples sucursales (Feature Preview)" />

            <Card className="p-8 rounded-2xl bg-gradient-to-r from-[hsl(var(--primary))] to-blue-700 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-xl font-bold mb-2">Ventas Globales</h2>
                    <div className="text-4xl font-black tabular-nums">$1,250,500.00 MXN</div>
                    <div className="text-sm text-white/60 mt-2">Mes actual • 5 Sucursales</div>
                </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
                <Card className="p-6 rounded-2xl backdrop-blur-md bg-surface-glass/40 border border-white/[0.06]">
                    <h3 className="font-bold mb-4">Top Sucursales</h3>
                    <ul className="space-y-3">
                        {[
                            { name: 'Sucursal Centro', amount: '$450k', pct: '75%' },
                            { name: 'Sucursal Norte', amount: '$320k', pct: '53%' },
                            { name: 'Sucursal Sur', amount: '$280k', pct: '47%' },
                        ].map(b => (
                            <li key={b.name} className="flex justify-between items-center">
                                <span className="text-sm">{b.name}</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-20 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary/60 rounded-full" style={{ width: b.pct }} />
                                    </div>
                                    <span className="font-bold text-sm tabular-nums">{b.amount}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
                <Card className="p-6 rounded-2xl backdrop-blur-md bg-surface-glass/40 border border-white/[0.06]">
                    <h3 className="font-bold mb-4">Rendimiento por Región</h3>
                    <div className="h-40 flex items-center justify-center bg-muted/10 rounded-xl text-muted-foreground text-sm">
                        [Gráfico de Mapa de Calor]
                    </div>
                </Card>
            </div>
        </ViewContainer>
    );
}
