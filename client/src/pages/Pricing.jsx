import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';
import { Button } from '../components/ui/Button';
import { Check, CreditCard, ArrowLeft } from 'lucide-react';
import { cn } from '../utils/cn';

function PricingCard({ title, price, features, recommended, onSelect }) {
    return (
        <div className={cn(
            'rounded-2xl overflow-hidden transition-all duration-300',
            recommended
                ? 'border-2 border-primary shadow-lg shadow-primary/10 scale-[1.02]'
                : 'border border-border/40 hover:border-border/60 hover:shadow-md'
        )}>
            {recommended && (
                <div className="bg-primary text-primary-foreground text-center text-xs font-bold py-1.5 uppercase tracking-wider">
                    Mas Popular
                </div>
            )}
            <div className="p-6 sm:p-8 bg-card">
                <div className="flex justify-center">
                    <span className="inline-flex px-4 py-1 rounded-full text-sm font-semibold tracking-wide uppercase bg-primary/10 text-primary">
                        {title}
                    </span>
                </div>
                <div className="mt-4 flex justify-center items-baseline gap-1">
                    <span className="text-5xl font-extrabold tracking-tight text-foreground">
                        {price === 0 ? 'Gratis' : `$${price}`}
                    </span>
                    {price > 0 && <span className="text-lg font-medium text-muted-foreground">/mes</span>}
                </div>
            </div>
            <div className="px-6 pb-8 sm:px-8 bg-card">
                <ul className="space-y-3">
                    {features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                            <div className="shrink-0 mt-0.5">
                                <Check className="size-4 text-success" />
                            </div>
                            <p className="text-sm text-foreground/80">{feat}</p>
                        </li>
                    ))}
                </ul>
                <div className="mt-6">
                    <Button
                        onClick={onSelect}
                        variant={recommended ? 'primary' : 'outline'}
                        className="w-full"
                    >
                        {price === 0 ? 'Comenzar Gratis' : 'Seleccionar Plan'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function Pricing() {
    const [mockCheckout, setMockCheckout] = useState(false);

    const handleSelect = (plan) => {
        if (plan === 'Free') window.location.href = '/register';
        else setMockCheckout(true);
    };

    if (mockCheckout) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="bg-card p-8 rounded-2xl shadow-lg border border-border/40 max-w-md w-full text-center">
                    <div className="size-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                        <CreditCard className="size-8 text-success" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-foreground">Checkout Simulado</h2>
                    <p className="text-muted-foreground mb-6">En produccion, aqui se redirige a Stripe/MercadoPago.</p>
                    <Button onClick={() => setMockCheckout(false)} className="w-full">
                        <ArrowLeft className="size-4 mr-2" />
                        Volver
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <nav className="border-b border-border-subtle bg-bg-surface sticky top-0 z-[var(--z-sticky)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link to="/" className="text-2xl font-bold text-primary">POS Pro</Link>
                    <div className="flex gap-4">
                        <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Login</Link>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">Planes y Precios</h2>
                    <p className="mt-4 text-lg text-muted-foreground">Elige la solucion perfecta para tu negocio.</p>
                </div>

                <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0">
                    <PricingCard
                        title="Emprendedor"
                        price={0}
                        features={['1 Usuario', '1 Sucursal', 'Ventas Ilimitadas', 'Inventario Basico', 'Soporte Comunitario']}
                        onSelect={() => handleSelect('Free')}
                    />
                    <PricingCard
                        title="Negocio"
                        price={499}
                        recommended={true}
                        features={['3 Usuarios', 'Reportes Avanzados', 'Facturacion CFDI 4.0', 'Soporte Prioritario', 'Copia de Seguridad Diaria']}
                        onSelect={() => handleSelect('Pro')}
                    />
                    <PricingCard
                        title="Empresa"
                        price={1499}
                        features={['Usuarios Ilimitados', 'Multi-Sucursal', 'API Access', 'Marca Blanca', 'Gerente de Cuenta']}
                        onSelect={() => handleSelect('Enterprise')}
                    />
                </div>
            </div>

            <Footer />
        </div>
    );
}
