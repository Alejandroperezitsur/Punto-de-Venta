import React from 'react';
import { Loader2 } from 'lucide-react';

export const Splash = () => {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[hsl(var(--background))] animate-in fade-in duration-300">
            <div className="relative mb-8">
                <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-5xl font-black text-white shadow-xl">
                    P
                </div>
                <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-green-500 rounded-full border-4 border-[hsl(var(--background))]" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
                POS Pro
            </h1>
            <p className="text-[hsl(var(--muted-foreground))] text-sm mb-8">
                Cargando sistema...
            </p>
            <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
        </div>
    );
};
