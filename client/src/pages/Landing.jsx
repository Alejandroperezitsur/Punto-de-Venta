import React from 'react';
import { Link } from 'react-router-dom';
import { Store, BarChart3, Package, FileText, Building2, Zap } from 'lucide-react';
import { Footer } from '../components/layout/Footer';

const featureIcon = (icon) => {
  switch (icon) {
    case 'sales': return <Store className="size-6" />;
    case 'invoicing': return <FileText className="size-6" />;
    case 'inventory': return <Package className="size-6" />;
    case 'reports': return <BarChart3 className="size-6" />;
    case 'multistore': return <Building2 className="size-6" />;
    case 'offline': return <Zap className="size-6" />;
    default: return null;
  }
};

export function Landing() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <nav className="border-b border-border bg-card">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">POS Pro</span>
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="text-muted-foreground hover:text-foreground font-medium text-sm transition-colors">
                            Iniciar Sesión
                        </Link>
                        <Link
                            to="/register"
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:brightness-110 font-semibold text-sm transition-all"
                        >
                            Empezar Gratis
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="relative overflow-hidden bg-muted/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                    <div className="text-center">
                        <h1 className="text-4xl tracking-tight font-extrabold text-foreground sm:text-5xl md:text-6xl">
                            <span className="block">Control total para tu negocio</span>
                            <span className="block text-primary">sin complicaciones</span>
                        </h1>
                        <p className="mt-3 max-w-md mx-auto text-base text-muted-foreground sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                            POS Pro es la plataforma todo-en-uno para gestionar ventas, inventario, facturación y pagos.
                            Diseñado para crecer desde un pequeño kiosco hasta una cadena de sucursales.
                        </p>
                        <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
                            <div className="rounded-md shadow">
                                <Link
                                    to="/register"
                                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-semibold rounded-md text-primary-foreground bg-primary hover:brightness-110 md:py-4 md:text-lg md:px-10 transition-all"
                                >
                                    Prueba Gratis
                                </Link>
                            </div>
                            <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                                <Link
                                    to="/pricing"
                                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-semibold rounded-md text-primary bg-card hover:bg-surface-hover md:py-4 md:text-lg md:px-10 transition-all"
                                >
                                    Ver Planes
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="py-12 bg-card">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h2 className="text-base text-primary font-semibold tracking-wide uppercase">Características</h2>
                        <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-foreground sm:text-4xl">
                            Todo lo que necesitas para vender
                        </p>
                    </div>

                    <div className="mt-10">
                        <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
                            <Feature
                                title="Punto de Venta Ágil"
                                desc="Ventas rápidas, cálculo de cambio automático y soporte para código de barras."
                                icon="sales"
                            />
                            <Feature
                                title="Facturación CFDI 4.0"
                                desc="Emisión de facturas electrónicas válida ante el SAT en segundos."
                                icon="invoicing"
                            />
                            <Feature
                                title="Control de Inventario"
                                desc="Rastrea existencias, costos y movimientos en tiempo real."
                                icon="inventory"
                            />
                            <Feature
                                title="Reportes Inteligentes"
                                desc="Conoce tus ventas diarias, productos top y desempeño financiero."
                                icon="reports"
                            />
                            <Feature
                                title="Multi-Sucursal"
                                desc="Gestiona múltiples tiendas desde un solo panel de administración."
                                icon="multistore"
                            />
                            <Feature
                                title="Soporte Offline"
                                desc="Sigue vendiendo aunque se caiga el internet (PWA)."
                                icon="offline"
                            />
                        </dl>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}

function Feature({ title, desc, icon }) {
    return (
        <div className="relative">
            <dt>
                <div className="absolute flex items-center justify-center size-12 rounded-md bg-primary/10 text-primary">
                    {featureIcon(icon)}
                </div>
                <p className="ml-16 text-lg leading-6 font-semibold text-foreground">{title}</p>
            </dt>
            <dd className="mt-2 ml-16 text-base text-muted-foreground">
                {desc}
            </dd>
        </div>
    );
}
