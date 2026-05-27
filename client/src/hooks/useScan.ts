import { useEffect, useRef, useCallback } from 'react';

interface UseScanOptions {
  minLength?: number;
  timeout?: number;
  enabled?: boolean;
  /** ms window to block duplicate barcode scans */
  dedupWindow?: number;
  /** ms after last scan to call onScannerIdle */
  idleTimeout?: number;
}

type ScanCallback = (code: string, quantity?: number) => void;
type IdleCallback = () => void;

export const useScan = (
  onScan: ScanCallback,
  onScannerIdle?: IdleCallback,
  options: UseScanOptions = {}
): void => {
  const {
    minLength = 3,
    timeout = 100,
    enabled = true,
    dedupWindow = 400,
    idleTimeout = 5000,
  } = options;

  const onScanRef = useRef<ScanCallback>(onScan);
  const onIdleRef = useRef<IdleCallback | undefined>(onScannerIdle);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    onIdleRef.current = onScannerIdle;
  }, [onScannerIdle]);

  useEffect(() => {
    if (!enabled) return;

    let buffer = '';
    let lastKeyTime = 0;
    let lastScannedCode = '';
    let lastScanTime = 0;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTimers = () => {
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    };

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        onIdleRef.current?.();
      }, idleTimeout);
    };

    const flushBuffer = () => {
      if (buffer.length >= minLength) {
        const code = buffer;
        buffer = '';
        const now = Date.now();
        if (code === lastScannedCode && now - lastScanTime < dedupWindow) {
          return;
        }
        lastScannedCode = code;
        lastScanTime = now;

        const qtyMatch = code.match(/^(\d+)\*(.+)$/);
        if (qtyMatch) {
          const qty = parseInt(qtyMatch[1], 10);
          const barcode = qtyMatch[2];
          onScanRef.current(barcode, qty);
        } else {
          onScanRef.current(code);
        }
      } else {
        buffer = '';
      }
      resetIdleTimer();
    };

    const isInputFocused = (target: EventTarget | null): boolean => {
      const el = target as HTMLElement;
      const tag = el?.tagName;
      const isFormField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      const isContentEditable = el?.isContentEditable;
      const isScanInput = el?.dataset?.scanInput === 'true';
      return (isFormField && !isScanInput) || !!isContentEditable;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (isInputFocused(e.target)) return;

      const char = e.key;

      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(char)) return;

      if (char === 'Enter') {
        if (buffer.length >= minLength) {
          e.preventDefault();
          e.stopPropagation();
          clearTimers();
          flushBuffer();
          lastKeyTime = 0;
          return;
        }
        buffer = '';
        lastKeyTime = 0;
        return;
      }

      if (char.length === 1) {
        const now = Date.now();
        if (now - lastKeyTime > timeout || lastKeyTime === 0) {
          buffer = '';
        }

        buffer += char;
        lastKeyTime = now;

        if (flushTimer) clearTimeout(flushTimer);

        flushTimer = setTimeout(() => {
          flushBuffer();
          flushTimer = null;
        }, timeout * 3);

        resetIdleTimer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    resetIdleTimer();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimers();
    };
  }, [enabled, minLength, timeout, dedupWindow, idleTimeout]);
};
