import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  variant?: 'default' | 'fullscreen' | 'sheet' | 'drawer';
  hideClose?: boolean;
  showClose?: boolean;
  className?: string;
  footer?: React.ReactNode;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-[95vw] max-h-[95vh]',
};

const Modal = Object.assign(React.memo(function Modal({
  open, onClose, title, description, children, size = 'md',
  variant = 'default', hideClose = false, showClose, className, footer,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [animate, setAnimate] = useState<'entering' | 'open' | 'closing' | 'closed'>('closed');

  useEffect(() => {
    if (open) {
      setAnimate('entering');
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setAnimate('open')));
      return () => cancelAnimationFrame(raf);
    } else if (animate === 'open') {
      setAnimate('closing');
      const timeout = setTimeout(() => setAnimate('closed'), 200);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (animate === 'closed') return null;

  const isFullscreen = variant === 'fullscreen';
  const isSheet = variant === 'sheet';
  const isDrawer = variant === 'drawer';

  return (
    <div
      ref={overlayRef}
      className={cn(
        'fixed inset-0 z-[var(--z-modal)] flex items-center justify-center',
        'transition-all duration-200',
        isFullscreen ? 'p-0' : 'p-4 sm:p-6',
      )}
      onClick={handleOverlayClick}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 transition-all duration-200',
          animate === 'open' ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/0 backdrop-blur-0',
        )}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative w-full bg-card border border-border/30 shadow-2xl overflow-hidden',
          'transition-all duration-200',
          animate === 'open' ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4',
          isFullscreen ? 'h-full max-w-full rounded-none' : 'rounded-2xl',
          isSheet ? 'fixed right-0 top-0 bottom-0 max-w-lg rounded-l-2xl rounded-r-none translate-x-0' : '',
          isDrawer ? 'fixed bottom-0 left-0 right-0 max-h-[85vh] rounded-b-none rounded-t-2xl translate-y-0' : '',
          !isFullscreen && !isSheet && !isDrawer && sizeStyles[size],
          isSheet && animate === 'open' ? 'translate-x-0' : isSheet ? 'translate-x-full' : '',
          isDrawer && animate === 'open' ? 'translate-y-0' : isDrawer ? 'translate-y-full' : '',
          className,
        )}
      >
        {/* Header */}
        {(title || !hideClose) && (
          <div className={cn(
            'flex items-center justify-between',
            'px-5 py-4 border-b border-border/25',
          )}>
            <div className="min-w-0 flex-1">
              {title && <h2 className="text-base font-bold text-foreground truncate">{title}</h2>}
              {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
            </div>
            {!hideClose && (
              <button
                onClick={onClose}
                className="size-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted/40 transition-all shrink-0 ml-3"
                aria-label="Cerrar"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className={cn(
          'overflow-y-auto',
          isFullscreen ? 'flex-1' : 'max-h-[70vh]',
          'px-5 py-4',
        )}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-border/25 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}), { displayName: 'Modal' });

/* Multi-step modal helper */
function ModalSteps({ current, steps, children }: { current: number; steps: string[]; children?: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {steps.map((step, i) => (
          <React.Fragment key={i}>
            <div className={cn(
              'flex items-center gap-2',
              i <= current ? 'text-foreground' : 'text-muted-foreground/40',
            )}>
              <span className={cn(
                'size-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all',
                i === current
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                  : i < current
                    ? 'bg-success/20 text-success border border-success/20'
                    : 'bg-muted border border-border/30',
              )}>
                {i < current ? '✓' : i + 1}
              </span>
              <span className={cn(
                'text-xs font-medium hidden sm:inline',
                i === current ? 'text-foreground font-semibold' : 'text-muted-foreground/50',
              )}>
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                'flex-1 h-px min-w-[24px]',
                i < current ? 'bg-success/40' : 'bg-border/30',
              )} />
            )}
          </React.Fragment>
        ))}
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}

const ModalWithSteps = Modal as typeof Modal & { Steps: typeof ModalSteps };
ModalWithSteps.Steps = ModalSteps;

export { ModalWithSteps as Modal };
export type { ModalProps };
