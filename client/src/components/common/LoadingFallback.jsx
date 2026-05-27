import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingFallback = ({ message = 'Cargando...' }) => {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="bg-card p-8 rounded-lg border border-border shadow-lg flex flex-col items-center">
                <Loader2 className="size-10 text-primary animate-spin" />
                <h3 className="mt-4 text-lg font-bold text-foreground">{message}</h3>
                <p className="text-sm text-muted-foreground mt-2">Preparando tu experiencia...</p>
            </div>
        </div>
    );
};
