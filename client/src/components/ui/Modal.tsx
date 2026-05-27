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

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.08 } },
  exit: { opacity: 0, transition: { duration: 0.06 } },
};

const panelVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.1 } },
  exit: { opacity: 0, y: 2, transition: { duration: 0.08 } },
};

const sheetVariants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { duration: 0.12 } },
  exit: { x: '100%', transition: { duration: 0.1 } },
};

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
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2, 8)}`).current;

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

  useEffect(() => {
    if (!open) return;
    const modal = document.querySelector('[role="dialog"]');
    if (!modal) return;
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', trap);
    first?.focus();
    return () => document.removeEventListener('keydown', trap);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <motion.div
            ref={overlayRef}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 bg-black/50"
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
          />
          <motion.div
            variants={sheet ? sheetVariants : panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              'relative z-10 w-full bg-card border border-border shadow-lg overflow-y-auto',
              sheet
                ? 'fixed right-0 top-0 bottom-0 max-w-lg rounded-none'
                : fullscreen
                  ? 'max-w-[95vw] h-[95vh] rounded-xl'
                  : `${sizes[size]} mx-4 rounded-xl`,
              className,
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
          >
            {(title || description) && (
              <div className="flex items-start justify-between p-4 pb-0">
                <div className="flex-1 min-w-0">
                  {title && <h2 id={titleId} className="text-lg font-bold tracking-tight">{title}</h2>}
                  {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="ml-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors shrink-0"
                  aria-label="Cerrar"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
            <div className={cn('p-4', !title && !description && '')}>
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
    <div className="flex items-center gap-1.5 mb-4" role="progressbar" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={total}>
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <div className={cn('flex items-center gap-1.5', i <= current ? 'text-primary' : 'text-muted-foreground/40')}>
            <div className={cn(
              'size-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors',
              i < current
                ? 'bg-primary text-primary-foreground border-primary'
                : i === current
                  ? 'bg-primary/10 text-primary border-primary'
                  : 'bg-muted text-muted-foreground border-border',
            )}>
              {i + 1}
            </div>
            {labels?.[i] && (
              <span className="text-[10px] font-semibold hidden sm:inline">{labels[i]}</span>
            )}
          </div>
          {i < total - 1 && (
            <div className={cn('w-6 h-px', i < current ? 'bg-primary' : 'bg-border')} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export { Modal, ModalSteps };
export type { ModalProps };
