import React from 'react';
import { Link } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';

export function Landing() {
    return (
        <div className="min-h-screen flex flex-col bg-white">
            {/* Navigation Stub */}
            <nav className="border-b bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <span className="text-2xl font-bold text-indigo-600">Ventify</span>
                    <div className="space-x-4">
                        <Link to="/login" className="text-gray-500 hover:text-gray-900 font-medium">Iniciar Sesión</Link>
                        <Link to="/register" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-medium">Empezar Gratis</Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                    <div className="text-center">
                        <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                            <span className="block">Control total para tu negocio</span>
                            <span className="block text-indigo-600">sin complicaciones</span>
                        </h1>
                        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                            Ventify es la plataforma todo-en-uno para gestionar ventas, inventario, facturación y pagos.
                            Diseñado para crecer desde un pequeño kiosco hasta una cadena de sucursales.
                        </p>
                        <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
                            <div className="rounded-md shadow">
                                <Link to="/register" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10">
                                    Prueba Gratis
                                </Link>
                            </div>
                            <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                                <Link to="/pricing" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10">
                                    Ver Planes
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Grid */}
            <div className="py-12 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Características</h2>
                        <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                            Todo lo que necesitas para vender
                        </p>
                    </div>

                    <div className="mt-10">
                        <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
                            <Feature
                                title="Punto de Venta Ágil"
                                desc="Ventas rápidas, cálculo de cambio automático y soporte para código de barras."
                                icon="🛒"
                            />
                            <Feature
                                title="Facturación CFDI 4.0"
                                desc="Emisión de facturas electrónicas válida ante el SAT en segundos."
                                icon="📄"
                            />
                            <Feature
                                title="Control de Inventario"
                                desc="Rastrea existencias, costos y movimientos en tiempo real."
                                icon="📦"
                            />
                            <Feature
                                title="Reportes Inteligentes"
                                desc="Conoce tus ventas diarias, productos top y desempeño financiero."
                                icon="📊"
                            />
                            <Feature
                                title="Multi-Sucursal"
                                desc="Gestiona múltiples tiendas desde un solo panel de administración."
                                icon="stores"
                            />
                            <Feature
                                title="Soporte Offline"
                                desc="Sigue vendiendo aunque se caiga el internet (PWA)."
                                icon="⚡"
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
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white text-2xl">
                    {icon === 'stores' ? <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> : icon}
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">{title}</p>
            </dt>
            <dd className="mt-2 ml-16 text-base text-gray-500">
                {desc}
            </dd>
        </div>
    );
}
