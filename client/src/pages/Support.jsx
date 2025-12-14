import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';
import { api } from '../lib/api';

export function Support() {
    const [issue, setIssue] = useState('');
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Send log to backend (mocked or real endpoint)
            // Just simulate success for now, or use system/log
            console.log('Report sent:', issue);
            setSent(true);
        } catch (e) {
            alert('Error al enviar reporte');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link to="/" className="text-2xl font-bold text-indigo-600">Ventify</Link>
                </div>
            </nav>

            <div className="flex-grow max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Centro de Ayuda</h1>

                {/* Status Indicator */}
                <div className="bg-white p-6 rounded-lg shadow mb-8 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">Estado del Sistema</h3>
                        <p className="text-sm text-gray-500">Todos los servicios operacionales</p>
                    </div>
                    <div className="flex items-center">
                        <span className="h-3 w-3 bg-green-500 rounded-full mr-2"></span>
                        <span className="text-green-700 font-bold">Online</span>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="bg-white p-6 rounded-lg shadow mb-8">
                    <h2 className="text-xl font-bold mb-4">Preguntas Frecuentes</h2>
                    <div className="space-y-4">
                        <details className="group">
                            <summary className="list-none flex justify-between items-center font-medium cursor-pointer text-gray-900">
                                ¿Cómo puedo emitir una factura?
                                <span className="transition group-open:rotate-180">
                                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                </span>
                            </summary>
                            <p className="text-gray-600 mt-3 group-open:animate-fadeIn">
                                Ve al historial de ventas, selecciona una venta y haz clic en el botón "Facturar". Ingresa el RFC del cliente y listo.
                            </p>
                        </details>
                        <hr className="border-gray-100" />
                        <details className="group">
                            <summary className="list-none flex justify-between items-center font-medium cursor-pointer text-gray-900">
                                ¿Puedo usar Ventify sin internet?
                                <span className="transition group-open:rotate-180">
                                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                </span>
                            </summary>
                            <p className="text-gray-600 mt-3 group-open:animate-fadeIn">
                                Sí. Ventify funciona offline gracias a su tecnología PWA. Las ventas se sincronizan cuando recuperas la conexión.
                            </p>
                        </details>
                    </div>
                </div>

                {/* Contact Form */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4">Reportar un problema</h2>
                    {sent ? (
                        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded text-center">
                            ¡Gracias! Tu reporte ha sido enviado. Nuestro equipo lo revisará pronto.
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del problema</label>
                                <textarea
                                    className="w-full border rounded p-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    rows="4"
                                    placeholder="Describe qué sucedió..."
                                    value={issue}
                                    onChange={e => setIssue(e.target.value)}
                                    required
                                ></textarea>
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 font-medium">
                                Enviar Reporte
                            </button>
                        </form>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
}
