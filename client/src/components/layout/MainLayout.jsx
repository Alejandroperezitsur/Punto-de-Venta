import React, { useEffect, useRef, memo } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useLocation } from 'react-router-dom';
import { ToastProvider } from '../ui/Toast';
import { useUserStore } from '../../store/userStore';
import { cn } from '../../utils/cn';

const MainLayout = memo(function MainLayout({ children }) {
  const location = useLocation();
  const isSidebarOpen = useUserStore(state => state.isSidebarOpen);
  const toggleSidebar = useUserStore(state => state.toggleSidebar);
  const mainRef = useRef(null);
  const isPOS = location.pathname === '/ventas';

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [location.pathname]);

  return (
    <ToastProvider>
      <div className="flex h-screen bg-background text-foreground font-sans antialiased overflow-hidden">
        <a href="#main-content" className="skip-to-content">
          Ir al contenido principal
        </a>

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[499] lg:hidden transition-opacity duration-200 animate-fade-in"
            onClick={toggleSidebar}
            onKeyDown={(e) => { if (e.key === 'Escape') toggleSidebar(); }}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <div className={cn(
          'h-full shrink-0 transition-transform duration-200 ease-out shadow-sm will-change-transform',
          'max-lg:fixed max-lg:left-0 max-lg:top-0 max-lg:shadow-xl',
          isSidebarOpen ? 'max-lg:translate-x-0 max-lg:z-[500]' : 'max-lg:-translate-x-full max-lg:z-[200]',
        )}>
          <Sidebar onNavigate={toggleSidebar} />
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          <Topbar />
          <main
            id="main-content"
            ref={mainRef}
            className={cn(
              'flex-1 overflow-y-auto overflow-x-hidden',
              isPOS ? 'p-3 lg:p-4' : 'p-4 md:p-5 lg:p-6 pb-8 md:pb-10',
            )}
            role="main"
          >
            <div key={location.pathname} className="animate-page-enter">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
});

export { MainLayout };