import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { ToastProvider } from '../ui/Toast';
import { FeedbackWidget } from '../common/FeedbackWidget';
import { AiAssistant } from '../ai/AiAssistant';

const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  type: 'spring',
  stiffness: 350,
  damping: 30,
  duration: 0.2,
};

export const MainLayout = ({ children }) => {
  const location = useLocation();
  const [info, setInfo] = useState({ copyright: '', version: '' });

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setInfo({
        copyright: data.app_copyright || '© 2026 POS Pro',
        version: data.app_version || '1.0.0',
      }))
      .catch(() => {});
  }, []);

  return (
    <ToastProvider>
      <div className="flex h-screen bg-background text-foreground font-sans antialiased overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-5 md:p-6 scroll-smooth">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                variants={prefersReducedMotion ? undefined : pageVariants}
                initial={prefersReducedMotion ? false : 'initial'}
                animate={prefersReducedMotion ? {} : 'animate'}
                exit={prefersReducedMotion ? undefined : 'exit'}
                transition={pageTransition}
                className="max-w-[1600px] mx-auto"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
          <footer className="shrink-0 py-2 px-6 border-t border-border bg-card text-xs text-muted-foreground flex justify-between items-center">
            <span>{info.copyright}</span>
            <span>v{info.version}</span>
          </footer>
        </div>
      </div>
      <FeedbackWidget />
      <AiAssistant />
    </ToastProvider>
  );
};
