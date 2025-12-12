import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const MainLayout = ({ children }) => {
    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--foreground)] font-sans antialiased">
            <Sidebar />
            <Topbar />
            <main className="pl-64 pt-16 min-h-screen transition-all">
                <div className="p-6 max-w-7xl mx-auto animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
};
