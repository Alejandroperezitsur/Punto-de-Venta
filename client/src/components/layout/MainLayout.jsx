import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

export const MainLayout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();

    useKeyboardShortcuts({
        'F1': (e) => { e.preventDefault(); alert('Ayuda: F2 Ventas, F3 Productos, F4 Clientes, F10 Config'); },
        'F2': (e) => { e.preventDefault(); navigate('/ventas'); },
        'F3': (e) => { e.preventDefault(); navigate('/productos'); },
        'F4': (e) => { e.preventDefault(); navigate('/clientes'); },
        'F10': (e) => { e.preventDefault(); navigate('/config'); },
    });

    return (
        <div className="flex h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] font-sans antialiased overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <Topbar />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, scale: 0.98, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="max-w-[1600px] mx-auto h-full"
                    >
                        {children}
                    </motion.div>
                </main>
            </div>
        </div>
    );
};
