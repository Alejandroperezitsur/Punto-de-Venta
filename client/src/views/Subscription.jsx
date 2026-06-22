import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { ViewContainer } from '../components/layout/ViewContainer';
import { ViewHeader } from '../components/layout/ViewHeader';
import { CreditCard, Check } from 'lucide-react';
import { cn } from '../utils/cn';

export default function Subscription() {
    const toast = useToast();
    const [sub, setSub] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api('/billing/current').then(setSub).catch(() => { });
    }, []);

    const handleUpgrade = async (planId) => {
        if (!confirm('¿Confirmar simulación de pago?')) return;
        setLoading(true);
        try {
            const res = await api('/billing/checkout', {
                method: 'POST',
                body: JSON.stringify({ planId })
            });
            if (res.success) {
                setSub(res.subscription);
                toast('¡Pago exitoso! Plan actualizado.', 'success');
            }
        } catch (e) {
            toast('Error en pago', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!sub) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;

    const plans = [
        { id: 'free', name: 'Emprendedor', price: '0', features: ['1 Sucursal', '50 Productos', 'Reportes básicos'] },
        { id: 'pro', name: 'Negocio Pro', price: '499', features: ['3 Sucursales', 'Productos ilimitados', 'Reportes avanzados', 'Soporte prioritario'] },
        { id: 'enterprise', name: 'Enterprise', price: '1,499', features: ['Sucursales ilimitadas', 'API access', 'Multi-empresa', 'Soporte 24/7'] },
    ];

    return (
        <ViewContainer>
            <ViewHeader title="Suscripción y Facturación" icon={<CreditCard className="size-5 text-primary" />} />

            <div className="grid md:grid-cols-3 gap-6">
                {plans.map(plan => {
                    const isCurrent = sub.plan_id === plan.id;
                    return (
                        <Card key={plan.id} className={cn('p-6 rounded-2xl border transition-all duration-200 relative overflow-hidden', isCurrent ? 'border-primary/30 bg-primary/[0.03]' : 'border-border/25 backdrop-blur-md bg-surface-glass/50 hover:border-primary/20 hover:shadow-md')}>
                            {isCurrent && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-primary/40" />}
                            <h3 className="font-bold text-lg">{plan.name}</h3>
                            <div className="text-3xl font-black my-3 tabular-nums">${plan.price} <span className="text-sm font-normal text-muted-foreground">/mes</span></div>
                            <ul className="space-y-2 mb-6">
                                {plan.features.map(f => (
                                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Check className="size-3.5 text-success shrink-0" /> {f}
                                    </li>
                                ))}
                            </ul>
                            {isCurrent ? (
                                <Badge variant="success" className="w-full text-center justify-center">Plan Actual</Badge>
                            ) : (
                                <Button onClick={() => handleUpgrade(plan.id)} disabled={loading} className="w-full">
                                    {loading ? 'Procesando...' : 'Seleccionar'}
                                </Button>
                            )}
                        </Card>
                    );
                })}
            </div>

            <Card className="p-6 mt-8 rounded-2xl backdrop-blur-md bg-surface-glass/50 border border-border/20">
                <h3 className="font-bold mb-4">Método de Pago</h3>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="text-2xl">💳</div>
                        <div>
                            <div className="font-medium">•••• •••• •••• 4242</div>
                            <div className="text-sm text-muted-foreground">Expira 12/28</div>
                        </div>
                    </div>
                    <Button variant="outline" size="sm">Cambiar tarjeta</Button>
                </div>
            </Card>
        </ViewContainer>
    );
}
