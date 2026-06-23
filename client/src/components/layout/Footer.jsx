import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
    return (
        <footer className="bg-card border-t border-border/40 mt-auto py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-center md:text-left">
                        <h3 className="text-lg font-bold text-primary">POS Pro</h3>
                        <p className="text-sm text-muted-foreground">El sistema de punto de venta que crece contigo.</p>
                    </div>
                    <div className="flex gap-6">
                        <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Acerca de</Link>
                        <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Precios</Link>
                        <Link to="/support" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Soporte</Link>
                    </div>
                </div>
                <div className="mt-8 border-t border-border/30 pt-8 text-center">
                    <p className="text-xs text-muted-foreground/70">&copy; {new Date().getFullYear()} POS Pro. Todos los derechos reservados.</p>
                </div>
            </div>
        </footer>
    );
}
