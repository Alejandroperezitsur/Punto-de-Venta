import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'sheet' | 'drawer';
  hideClose?: boolean;
  className?: string;
  footer?: React.ReactNode;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

const Modal = Object.assign(React.memo(function Modal({
  open, onClose, title, description, children, size = 'md',
  variant = 'default', hideClose = false, className, footer,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setVisible(true);
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => panelRef.current?.focus());
    } else {
      document.body.style.overflow = '';
      const timer = setTimeout(() => setVisible(false), 200);
      previousFocusRef.current?.focus();
      return () => clearTimeout(timer);
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open && !visible) return null;

  const isSheet = variant === 'sheet';
  const isDrawer = variant === 'drawer';

  return (
    <div
      className={cn(
        'fixed inset-0 z-[var(--z-modal)] flex',
        isSheet ? 'justify-end' : isDrawer ? 'items-end justify-center' : 'items-center justify-center',
        isDrawer ? 'p-0' : 'p-4 sm:p-6',
      )}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className={cn(
          'absolute inset-0 transition-all duration-200',
          open ? 'bg-black/40' : 'bg-black/0',
        )}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative bg-bg-surface shadow-dialog overflow-hidden',
          'transition-all duration-200',
          open ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
          isSheet
            ? cn('fixed right-0 top-0 bottom-0 w-full max-w-md rounded-l-lg', open ? 'translate-x-0' : 'translate-x-4')
            : isDrawer
              ? cn('fixed bottom-0 left-0 right-0 max-h-[85vh] rounded-t-lg', open ? 'translate-y-0' : 'translate-y-4')
              : cn('rounded-lg w-full', sizeStyles[size], open ? 'translate-y-0' : 'translate-y-4'),
          className,
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-center justify-between px-[var(--padding-modal)] py-4 border-b border-border-subtle">
            <div className="min-w-0 flex-1">
              {title && <h2 className="text-[var(--text-heading-md)] font-semibold text-text-primary truncate">{title}</h2>}
              {description && <p className="text-sm text-text-secondary mt-0.5">{description}</p>}
            </div>
            {!hideClose && (
              <button
                onClick={onClose}
                className="size-8 rounded-md flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover transition-colors shrink-0 ml-3"
                aria-label="Cerrar"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        )}

        <div className={cn('overflow-y-auto', isDrawer ? 'max-h-[60vh]' : 'max-h-[70vh]', 'px-[var(--padding-modal)] py-5')}>
          {children}
        </div>

        {footer && (
          <div className="px-[var(--padding-modal)] py-4 border-t border-border-subtle flex items-center justify-between gap-2">
            <span className="text-[8px] text-text-tertiary/30 select-none hidden sm:inline">POS Pro</span>
            <div className="flex items-center gap-2">{footer}</div>
          </div>
        )}
      </div>
    </div>
  );
}), { displayName: 'Modal' });

function ModalSteps({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div className={cn(
            'flex items-center gap-2',
            i <= current ? 'text-text-primary' : 'text-text-disabled',
          )}>
            <span className={cn(
              'size-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all',
              i === current
                ? 'bg-action-primary text-[var(--bg-surface)]'
                : i < current
                  ? 'bg-success-bg text-success border border-success/20'
                  : 'bg-bg-inset border border-border-subtle',
            )}>
              {i < current ? '\u2713' : i + 1}
            </span>
            <span className={cn(
              'text-xs font-medium hidden sm:inline',
              i === current ? 'font-semibold' : '',
            )}>
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn(
              'flex-1 h-px min-w-[24px]',
              i < current ? 'bg-success/40' : 'bg-border-subtle',
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

const ModalWithSteps = Modal as typeof Modal & { Steps: typeof ModalSteps };
ModalWithSteps.Steps = ModalSteps;

export { ModalWithSteps as Modal };
export type { ModalProps };
