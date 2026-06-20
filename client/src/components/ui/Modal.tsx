import React, { useEffect, useRef, useCallback, useState } from 'react';
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
  drawer?: boolean;
  children?: React.ReactNode;
  className?: string;
  onRestoreFocus?: () => void;
  hideClose?: boolean;
  zIndex?: number;
}

function useFocusTrap(open: boolean, onClose: () => void) {
  const previousFocus = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement;
    const modal = modalRef.current;
    if (!modal) return;

    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (first) first.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab' || !first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };

    document.addEventListener('keydown', trap);
    return () => {
      document.removeEventListener('keydown', trap);
      if (previousFocus.current) previousFocus.current.focus();
    };
  }, [open, onClose]);
}

function Modal({
  open, onClose, title, description, size = 'md', fullscreen, sheet, drawer,
  children, className, onRestoreFocus, hideClose = false, zIndex = 300,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2, 8)}`).current;
  const [shouldRender, setShouldRender] = useState(false);
  const [animState, setAnimState] = useState<'entering' | 'entered' | 'exiting' | 'exited'>('exited');
  const isReduced = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ).current;

  useFocusTrap(open, onClose);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      if (isReduced) {
        setAnimState('entered');
      } else {
        setAnimState('entering');
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setAnimState('entered'));
        });
      }
    } else if (shouldRender) {
      setAnimState('exiting');
      const timer = setTimeout(() => {
        setAnimState('exited');
        setShouldRender(false);
      }, isReduced ? 0 : 120);
      return () => clearTimeout(timer);
    }
  }, [open, isReduced]);

  useEffect(() => {
    if (!shouldRender) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      if (onRestoreFocus) requestAnimationFrame(onRestoreFocus);
    };
  }, [shouldRender, onRestoreFocus]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  }, [onClose]);

  if (!shouldRender) return null;

  const isOpen = animState === 'entered';
  const isDrawer = drawer || sheet;

  return (
    <div
      className={cn('fixed inset-0 flex', isDrawer ? 'justify-end' : 'items-center justify-center')}
      style={{ zIndex }}
    >
      <div
        ref={overlayRef}
        className={cn(
          'absolute inset-0 transition-opacity',
          isReduced ? '' : 'duration-80',
          isOpen ? 'opacity-100' : 'opacity-0',
          isDrawer ? 'bg-black/40 backdrop-blur-[2px]' : 'bg-black/50 backdrop-blur-[3px]',
        )}
        onClick={handleOverlayClick}
      />
      <div
        ref={panelRef}
        className={cn(
          'relative w-full bg-card border shadow-xl overflow-y-auto',
          'transition-all',
          isReduced ? '' : 'duration-100',
          isOpen
            ? 'opacity-100 translate-x-0 translate-y-0'
            : drawer
              ? 'opacity-100 translate-x-full'
              : 'opacity-0 translate-y-[4px]',
          drawer
            ? 'fixed right-0 top-0 bottom-0 max-w-lg rounded-none border-l border-border/40'
            : sheet
              ? 'fixed right-0 top-0 bottom-0 max-w-lg rounded-none'
              : fullscreen
                ? `max-w-[95vw] h-[95vh] rounded-2xl border-border/40`
                : `${sizes[size]} mx-4 rounded-2xl border-border/40`,
          'pb-[env(safe-area-inset-bottom,0px)] max-h-[95vh]',
          className,
        )}
        role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined}
      >
        {(title || description) && (
          <div className="flex items-start justify-between px-5 pt-5 pb-0">
            <div className="flex-1 min-w-0">
              {title && (
                <div className="flex items-center gap-3">
                  <span className="w-1 h-5 rounded-full bg-primary shrink-0" />
                  <h2 id={titleId} className="text-lg font-bold tracking-tight">{title}</h2>
                </div>
              )}
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            {!hideClose && (
              <button onClick={onClose} className="ml-3 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors shrink-0" aria-label="Cerrar">
                <X className="size-4" />
              </button>
            )}
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
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
              i < current ? 'bg-primary text-primary-foreground border-primary'
                : i === current ? 'bg-primary/10 text-primary border-primary'
                  : 'bg-muted text-muted-foreground border-border',
            )}>
              {i + 1}
            </div>
            {labels?.[i] && <span className="text-[10px] font-semibold hidden sm:inline">{labels[i]}</span>}
          </div>
          {i < total - 1 && <div className={cn('w-6 h-px', i < current ? 'bg-primary' : 'bg-border')} />}
        </React.Fragment>
      ))}
    </div>
  );
}

export { Modal, ModalSteps };
export type { ModalProps };
