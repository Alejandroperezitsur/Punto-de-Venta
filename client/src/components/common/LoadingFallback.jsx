import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingFallback = ({ message = 'Cargando...' }) => {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white p-8 rounded-2xl shadow-xl border flex flex-col items-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-200 rounded-full animate-ping opacity-25"></div>
                    <Loader2 className="h-10 w-10 text-indigo-600 animate-spin relative z-10" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-gray-800 animate-pulse">{message}</h3>
                <p className="text-sm text-gray-400 mt-2">Preparando tu experiencia...</p>
            </div>
        </div>
    );
};
