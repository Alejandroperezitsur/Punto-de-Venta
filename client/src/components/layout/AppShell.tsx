import React, { useEffect, useRef, memo } from 'react';
import { useLocation } from 'react-router-dom';
import { ToastProvider } from '../ui/Toast';
import { RailNav } from './RailNav';
import { AppHeader } from './AppHeader';
import { TouchBar } from './TouchBar';
import { cn } from '../../utils/cn';

const AppShell = memo(function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);
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

        {/* Rail Navigation */}
        <RailNav />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 bg-bg-app">
          <AppHeader />

          <main
            id="main-content"
            ref={mainRef}
            className={cn(
              'flex-1 overflow-y-auto overflow-x-hidden',
              isPOS ? 'p-0' : 'p-4 sm:p-5 lg:p-6',
              'pb-[var(--touchbar-height)] md:pb-6',
            )}
            role="main"
          >
            <div key={location.pathname} className="animate-fade-in h-full">
              {children}
            </div>
          </main>

          <TouchBar />

          {/* Subtle branding watermark */}
          <div className="hidden md:block fixed bottom-2 right-3 z-0 pointer-events-none select-none">
            <span className="text-[9px] text-text-tertiary/30 font-medium tracking-wide">POS Pro · APV Labs</span>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
});

export { AppShell };
