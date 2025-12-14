import React, { useState, useEffect } from 'react';

export function WelcomeTour() {
    const [step, setStep] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const seen = localStorage.getItem('ventify_tour_seen');
        if (!seen) {
            // Small delay to allow UI to load
            const timer = setTimeout(() => setVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleNext = () => setStep(s => s + 1);
    const handleClose = () => {
        setVisible(false);
        localStorage.setItem('ventify_tour_seen', 'true');
    };

    if (!visible) return null;

    const steps = [
        {
            title: '¡Bienvenido a Ventify! 🚀',
            content: 'El sistema que crece contigo. Simplificamos tus ventas para que tú te enfoques en crecer.',
            position: 'center'
        },
        {
            title: '🛒 Punto de Venta Rápido',
            content: 'Tu caja registradora moderna. Usa el escáner o busca productos al instante. ¡Soporta atajos de teclado!',
            position: 'top-left'
        },
        {
            title: '⚡ Facturación al Instante',
            content: 'Olvídate de portales externos. Factura (CFDI 4.0) directamente al cerrar la venta o desde el historial.',
            position: 'center'
        },
        {
            title: '📊 Toma Decisiones Reales',
            content: 'Nuestra IA analiza tus datos y te dice qué vender y cuándo reabastecer. Revisa el Dashboard de Insights.',
            position: 'bottom-right'
        }
    ];

    const current = steps[step];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={handleClose}></div>

            {/* Modal Card */}
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full relative z-10 pointer-events-auto animate-fadeUp">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-indigo-600">{current.title}</h3>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">×</button>
                </div>
                <p className="text-gray-600 mb-6">{current.content}</p>
                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">{step + 1} de {steps.length}</span>
                    <div className="flex gap-2">
                        {step < steps.length - 1 ? (
                            <button onClick={handleNext} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm font-medium">
                                Siguiente
                            </button>
                        ) : (
                            <button onClick={handleClose} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium">
                                ¡Empezar!
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
