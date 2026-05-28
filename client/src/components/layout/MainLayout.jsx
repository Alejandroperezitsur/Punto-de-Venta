import React, { useEffect, useState, useCallback, memo, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useLocation } from 'react-router-dom';
import { ToastProvider } from '../ui/Toast';
import { useUserStore } from '../../store/userStore';
import { api } from '../../lib/api';
import { cn } from '../../utils/cn';

const MainLayout = memo(function MainLayout({ children }) {
  const location = useLocation();
  const [info, setInfo] = useState({ copyright: '', version: '' });
  const isSidebarOpen = useUserStore(state => state.isSidebarOpen);
  const toggleSidebar = useUserStore(state => state.toggleSidebar);
  const mainRef = useRef(null);

  useEffect(() => {
    api('/settings')
      .then(data => setInfo({
        copyright: data.app_copyright || '\u00a9 2026 POS Pro',
        version: data.app_version || '1.0.0',
      }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [location.pathname]);

  return (
    <ToastProvider>
      <div className="flex h-screen bg-background text-foreground font-sans antialiased overflow-hidden">
        <a href="#main-content" className="skip-to-content">
          Ir al contenido principal
        </a>

        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-[var(--z-overlay)] lg:hidden"
            onClick={toggleSidebar}
            onKeyDown={(e) => { if (e.key === 'Escape') toggleSidebar(); }}
            aria-hidden="true"
          />
        )}

        <div className={cn(
          'h-full shrink-0 transition-transform duration-100 ease-linear z-[var(--z-sticky)]',
          'max-lg:fixed max-lg:left-0 max-lg:top-0',
          isSidebarOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
        )}>
          <Sidebar onNavigate={toggleSidebar} />
        </div>
        <div className="flex-1 flex flex-col min-w-0 bg-background/50">
          <Topbar />
          <main id="main-content" ref={mainRef} className="flex-1 overflow-y-auto p-2 md:p-3 lg:p-4" role="main">
            {children}
          </main>
          <footer className="shrink-0 py-3 px-3 md:px-4 border-t border-border/30 text-[10px] font-medium text-muted-foreground/60 flex justify-between items-center" role="contentinfo">
            <span>{info.copyright}</span>
            <span>v{info.version}</span>
          </footer>
        </div>
      </div>
    </ToastProvider>
  );
});

export { MainLayout };
