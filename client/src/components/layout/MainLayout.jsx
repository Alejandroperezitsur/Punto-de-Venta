import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useLocation } from 'react-router-dom';
import { ToastProvider } from '../ui/Toast';
import { api } from '../../lib/api';

export const MainLayout = ({ children }) => {
  const location = useLocation();
  const [info, setInfo] = useState({ copyright: '', version: '' });

  useEffect(() => {
    api('/settings')
      .then(data => setInfo({
        copyright: data.app_copyright || '© 2026 POS Pro',
        version: data.app_version || '1.0.0',
      }))
      .catch(() => {});
  }, []);

  return (
    <ToastProvider>
      <div className="flex h-screen bg-background text-foreground font-sans antialiased overflow-hidden">
        <a href="#main-content" className="skip-to-content">
          Ir al contenido principal
        </a>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-background/50">
          <Topbar />
          <main id="main-content" className="flex-1 overflow-y-auto p-5 md:p-6 lg:p-8" role="main" key={location.pathname}>
            {children}
          </main>
          <footer className="shrink-0 py-3 px-6 border-t border-border/30 text-xs font-medium text-muted-foreground/60 flex justify-between items-center" role="contentinfo">
            <span>{info.copyright}</span>
            <span>v{info.version}</span>
          </footer>
        </div>
      </div>
    </ToastProvider>
  );
};
