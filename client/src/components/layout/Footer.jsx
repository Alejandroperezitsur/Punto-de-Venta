import React from 'react';

export function Footer() {
    return (
        <footer className="bg-gray-50 border-t mt-auto py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <div className="mb-4 md:mb-0">
                        <h3 className="text-lg font-bold text-indigo-600">Ventify</h3>
                        <p className="text-sm text-gray-500">El sistema de punto de venta que crece contigo.</p>
                    </div>
                    <div className="flex space-x-6">
                        <a href="/about" className="text-gray-500 hover:text-gray-900">Acerca de</a>
                        <a href="/pricing" className="text-gray-500 hover:text-gray-900">Precios</a>
                        <a href="/support" className="text-gray-500 hover:text-gray-900">Soporte</a>
                        <a href="/docs" className="text-gray-500 hover:text-gray-900">Docs</a>
                    </div>
                </div>
                <div className="mt-8 border-t border-gray-200 pt-8 text-center">
                    <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} Ventify POS. Todos los derechos reservados.</p>
                </div>
            </div>
        </footer>
    );
}
