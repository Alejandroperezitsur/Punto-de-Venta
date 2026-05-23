import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-[95vw] h-[95vh]',
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: keyof typeof sizes;
  fullscreen?: boolean;
  sheet?: boolean;
  children?: React.ReactNode;
  className?: string;
}

function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  fullscreen,
  sheet,
  children,
  className,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
          />
          <motion.div
            initial={sheet ? { x: '100%' } : { opacity: 0, scale: 0.95, y: 10 }}
            animate={sheet ? { x: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={sheet ? { x: '100%' } : { opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              'relative z-10 w-full bg-card border border-border shadow-2xl overflow-y-auto',
              sheet
                ? 'fixed right-0 top-0 bottom-0 max-w-lg rounded-none'
                : fullscreen
                  ? 'max-w-[95vw] h-[95vh] rounded-3xl'
                  : `${sizes[size]} mx-4 rounded-3xl`,
              className,
            )}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {(title || description) && (
              <div className="flex items-start justify-between p-6 pb-0">
                <div className="flex-1 min-w-0">
                  {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
                  {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="ml-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors shrink-0"
                  aria-label="Cerrar"
                >
                  <X className="size-5" />
                </button>
              </div>
            )}
            <div className={cn('p-6', !title && !description && '')}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ModalSteps({ current, total, labels }: { current: number; total: number; labels?: string[] }) {
  return (
    <div className="flex items-center gap-2 mb-6" role="progressbar" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={total}>
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <div className={cn(
            'flex items-center gap-2',
            i <= current ? 'text-primary' : 'text-muted-foreground/40',
          )}>
            <div className={cn(
              'size-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300',
              i < current
                ? 'bg-primary text-primary-foreground border-primary'
                : i === current
                  ? 'bg-primary/10 text-primary border-primary'
                  : 'bg-muted text-muted-foreground border-border',
            )}>
              {i + 1}
            </div>
            {labels?.[i] && (
              <span className="text-xs font-semibold hidden sm:inline">{labels[i]}</span>
            )}
          </div>
          {i < total - 1 && (
            <div className={cn(
              'flex-1 h-0.5 rounded-full transition-colors duration-300',
              i < current ? 'bg-primary' : 'bg-border',
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export { Modal, ModalSteps };
export type { ModalProps };
