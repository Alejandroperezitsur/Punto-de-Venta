import React, { useEffect, useRef, memo } from 'react';
import { Sidebar } from './Sidebar';
import { Toolbar } from './Toolbar';
import { TabStrip } from './TabStrip';
import { TouchBar } from './TouchBar';
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
      <div className="flex h-screen bg-bg-app text-text-primary font-sans antialiased overflow-hidden">
        <div className="signal-bar" id="signal-bar" aria-hidden="true" />

        <a href="#main-content" className="skip-to-content">
          Ir al contenido principal
        </a>

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[499] lg:hidden transition-opacity duration-200"
            onClick={toggleSidebar}
            aria-hidden="true"
          />
        )}

        {/* Sidebar (optional — can be toggled on/off) */}
        {isSidebarOpen && (
          <div className={cn(
            'h-full shrink-0 transition-transform duration-200',
            'max-lg:fixed max-lg:left-0 max-lg:top-0 max-lg:z-[500]',
            isSidebarOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
          )}>
            <Sidebar onNavigate={toggleSidebar} />
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 bg-bg-app">
          {/* Signal Toolbar */}
          <Toolbar />

          {/* Tab Strip navigation */}
          <TabStrip />

          <main
            id="main-content"
            ref={mainRef}
            className={cn(
              'flex-1 overflow-y-auto overflow-x-hidden',
              isPOS ? 'p-2 sm:p-3 lg:p-4' : 'p-3 sm:p-4 md:p-5 lg:p-6 pb-8 md:pb-10',
              'pb-[var(--touchbar-height)] md:pb-10',
            )}
            role="main"
          >
            <div key={location.pathname} className="animate-fade-in">
              {children}
            </div>
          </main>

          {/* Touch navigation bar (mobile/tablet only) */}
          <TouchBar />
        </div>
      </div>
    </ToastProvider>
  );
});

export { MainLayout };
