import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';

function PricingCard({ title, price, features, recommended, onSelect }) {
    return (
        <div className={`rounded-lg shadow-lg overflow-hidden ${recommended ? 'border-2 border-indigo-500 transform scale-105' : 'border border-gray-200'}`}>
            {recommended && <div className="bg-indigo-500 text-white text-center text-xs font-bold py-1 uppercase tracking-wider">Más Popular</div>}
            <div className="px-6 py-8 bg-white sm:p-10 sm:pb-6">
                <div className="flex justify-center">
                    <span className="inline-flex px-4 py-1 rounded-full text-sm font-semibold tracking-wide uppercase bg-indigo-100 text-indigo-600">
                        {title}
                    </span>
                </div>
                <div className="mt-4 flex justify-center text-6xl leading-none font-extrabold text-gray-900">
                    {price === 0 ? 'Gratis' : `$${price}`}
                    {price > 0 && <span className="ml-1 text-2xl leading-8 font-medium text-gray-500 self-end">/mes</span>}
                </div>
            </div>
            <div className="px-6 pt-6 pb-8 bg-white sm:p-10 sm:pt-6">
                <ul className="space-y-4">
                    {features.map((feat, idx) => (
                        <li key={idx} className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="ml-3 text-base text-gray-700">{feat}</p>
                        </li>
                    ))}
                </ul>
                <div className="mt-8 rounded-md shadow">
                    <button onClick={onSelect} className={`w-full flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white ${recommended ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-800 hover:bg-gray-900'}`}>
                        {price === 0 ? 'Comenzar Gratis' : 'Seleccionar Plan'}
                    </button>
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
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-lg shadow max-w-md w-full text-center">
                    <div className="text-green-500 text-5xl mb-4">💳</div>
                    <h2 className="text-2xl font-bold mb-2">Checkout Simulado</h2>
                    <p className="text-gray-600 mb-6">En producción, aquí se redirige a Stripe/MercadoPago.</p>
                    <button onClick={() => setMockCheckout(false)} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Volver</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Navbar Stub */}
            <nav className="border-b bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link to="/" className="text-2xl font-bold text-indigo-600">Ventify</Link>
                    <div className="space-x-4">
                        <Link to="/login" className="text-gray-500 font-medium">Login</Link>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Planes y Precios</h2>
                    <p className="mt-4 text-xl text-gray-500">Elige la solución perfecta para tu negocio.</p>
                </div>

                <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0">
                    <PricingCard
                        title="Emprendedor"
                        price={0}
                        features={['1 Usuario', '1 Sucursal', 'Ventas Ilimitadas', 'Inventario Básico', 'Soporte Comunitario']}
                        onSelect={() => handleSelect('Free')}
                    />
                    <PricingCard
                        title="Negocio"
                        price={499}
                        recommended={true}
                        features={['3 Usuarios', 'Reportes Avanzados', 'Facturación CFDI 4.0', 'Soporte Prioritario', 'Copia de Seguridad Diaria']}
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
