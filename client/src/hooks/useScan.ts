import { useEffect, useRef, useCallback } from 'react';

interface UseScanOptions {
  minLength?: number;
  timeout?: number;
  enabled?: boolean;
}

type ScanCallback = (code: string, quantity?: number) => void;

export const useScan = (onScan: ScanCallback, options: UseScanOptions = {}): void => {
  const {
    minLength = 3,
    timeout = 100,
    enabled = true,
  } = options;

  const onScanRef = useRef<ScanCallback>(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    let buffer = '';
    let lastKeyTime = 0;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

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

      const now = Date.now();
      const char = e.key;

      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(char)) return;

      if (char.length === 1) {
        if (now - lastKeyTime > timeout || lastKeyTime === 0) {
          buffer = '';
        }

        buffer += char;
        lastKeyTime = now;

        if (flushTimer) clearTimeout(flushTimer);

        flushTimer = setTimeout(() => {
          if (buffer.length >= minLength) {
            onScanRef.current(buffer);
          }
          buffer = '';
          flushTimer = null;
        }, timeout * 3);
      }

      if (char === 'Enter') {
        if (buffer.length >= minLength) {
          e.preventDefault();
          onScanRef.current(buffer);
        }
        buffer = '';
        lastKeyTime = 0;
        if (flushTimer) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (flushTimer) clearTimeout(flushTimer);
    };
  }, [enabled, minLength, timeout]);
};
