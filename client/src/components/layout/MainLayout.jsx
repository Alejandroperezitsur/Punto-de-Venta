import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useLocation } from 'react-router-dom';
import { ToastProvider } from '../ui/Toast';
import { useUserStore } from '../../store/userStore';
import { api } from '../../lib/api';
import { cn } from '../../utils/cn';

export const MainLayout = ({ children }) => {
  const location = useLocation();
  const [info, setInfo] = useState({ copyright: '', version: '' });
  const isSidebarOpen = useUserStore(state => state.isSidebarOpen);
  const toggleSidebar = useUserStore(state => state.toggleSidebar);

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

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-20 lg:hidden"
            onClick={toggleSidebar}
            onKeyDown={(e) => { if (e.key === 'Escape') toggleSidebar(); }}
            aria-hidden="true"
          />
        )}

        <div className={cn(
          'h-full shrink-0 transition-transform duration-200 z-30',
          'max-lg:fixed max-lg:left-0 max-lg:top-0',
          isSidebarOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
        )}>
          <Sidebar onNavigate={toggleSidebar} />
        </div>
        <div className="flex-1 flex flex-col min-w-0 bg-background/50">
          <Topbar />
          <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6" role="main" key={location.pathname}>
            {children}
          </main>
          <footer className="shrink-0 py-3 px-4 md:px-6 border-t border-border/30 text-xs font-medium text-muted-foreground/60 flex justify-between items-center" role="contentinfo">
            <span>{info.copyright}</span>
            <span>v{info.version}</span>
          </footer>
        </div>
      </div>
    </ToastProvider>
  );
};
