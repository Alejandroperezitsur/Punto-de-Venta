import { useEffect, useRef, useCallback } from 'react';

interface UseScanOptions {
  minLength?: number;
  timeout?: number;
  enabled?: boolean;
  dedupWindow?: number;
  idleTimeout?: number;
}

type ScanCallback = (code: string, quantity?: number) => void;
type IdleCallback = () => void;

const DEFAULT_OPTIONS: Required<UseScanOptions> = {
  minLength: 3,
  timeout: 100,
  enabled: true,
  dedupWindow: 400,
  idleTimeout: 5000,
};

export const useScan = (
  onScan: ScanCallback,
  onScannerIdle?: IdleCallback,
  options: UseScanOptions = {}
): void => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const onScanRef = useRef<ScanCallback>(onScan);
  const onIdleRef = useRef<IdleCallback | undefined>(onScannerIdle);

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => { onIdleRef.current = onScannerIdle; }, [onScannerIdle]);

  useEffect(() => {
    if (!opts.enabled) return;

    let buffer = '';
    let lastKeyTime = 0;
    let lastScannedCode = '';
    let lastScanTime = 0;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let scanCount = 0;
    let burstDetected = false;

    const clearTimers = () => {
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
      burstDetected = false;
    };

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => onIdleRef.current?.(), opts.idleTimeout);
    };

    const flushBuffer = () => {
      if (buffer.length >= opts.minLength) {
        const code = buffer;
        buffer = '';
        const now = Date.now();

        const qtyMatch = code.match(/^(\d{1,3})\*(.+)$/);
        let finalCode = code;
        let quantity = 1;
        if (qtyMatch) {
          quantity = parseInt(qtyMatch[1], 10);
          finalCode = qtyMatch[2];
        }

        if (finalCode === lastScannedCode && now - lastScanTime < opts.dedupWindow) {
          scanCount++;
          if (scanCount > 5) burstDetected = true;
          return;
        }

        if (burstDetected) {
          burstDetected = false;
          scanCount = 0;
        }

        lastScannedCode = finalCode;
        lastScanTime = now;
        scanCount = 0;

        onScanRef.current(finalCode, quantity);
      } else {
        buffer = '';
      }
      resetIdleTimer();
    };

    const isScannerInput = (el: EventTarget | null): boolean => {
      const target = el as HTMLElement;
      return target?.dataset?.scanInput === 'true';
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      const target = e.target as HTMLElement;
      const tag = target?.tagName;
      const isFormField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      const isContentEditable = target?.isContentEditable;

      if (isFormField && !isScannerInput(e.target)) return;
      if (isContentEditable) return;

      const key = e.key;
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(key)) return;

      if (key === 'Enter') {
        if (buffer.length >= opts.minLength) {
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

      if (key.length === 1) {
        const now = Date.now();
        if (now - lastKeyTime > opts.timeout || lastKeyTime === 0) {
          buffer = '';
        }

        buffer += key;
        lastKeyTime = now;

        if (flushTimer) clearTimeout(flushTimer);
        flushTimer = setTimeout(() => { flushBuffer(); flushTimer = null; }, opts.timeout * 3);

        resetIdleTimer();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    resetIdleTimer();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimers();
    };
  }, [opts.enabled, opts.minLength, opts.timeout, opts.dedupWindow, opts.idleTimeout]);
};
