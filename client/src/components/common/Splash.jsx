import React from 'react';
import { Loader2, Store } from 'lucide-react';

export const Splash = () => {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background animate-in fade-in duration-300">
            <div className="relative mb-8">
                <div className="size-24 rounded-lg bg-primary/10 flex items-center justify-center text-5xl font-black text-primary shadow-lg">
                    <Store className="size-12" />
                </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">POS Pro</h1>
            <p className="text-sm text-muted-foreground mb-8">Cargando sistema...</p>
            <Loader2 className="size-6 animate-spin text-primary" />
        </div>
    );
};
