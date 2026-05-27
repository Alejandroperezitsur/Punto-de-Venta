import { useEffect, useRef, useCallback } from 'react';

type FocusSource = 'scan' | 'modal' | 'toast' | 'route' | 'reconnect' | 'sale-complete' | 'manual';

interface FocusLock {
  source: FocusSource;
  priority: number;
}

const FOCUS_SOURCE_PRIORITY: Record<FocusSource, number> = {
  scan: 100,
  sale: 99,
  manual: 98,
  modal: 50,
  toast: 40,
  route: 30,
  reconnect: 20,
};

const SCAN_INPUT_SELECTOR = '[data-scan-input]';
const REFOCUS_INTERVAL_MS = 3000;
const REFOCUS_ATTEMPT_LIMIT = 3;

let globalFocusLock: FocusLock | null = null;
let globalRefocusTimer: ReturnType<typeof setInterval> | null = null;
let refocusAttempts = 0;

export function useScannerFocusEngine() {
  const lastFocusTime = useRef(0);
  const observerRef = useRef<MutationObserver | null>(null);
  const isRefocusing = useRef(false);

  const getScanInput = useCallback((): HTMLInputElement | null => {
    return document.querySelector<HTMLInputElement>(SCAN_INPUT_SELECTOR);
  }, []);

  const isScanInputFocused = useCallback((): boolean => {
    const input = getScanInput();
    return input === document.activeElement;
  }, [getScanInput]);

  const acquireFocusLock = useCallback((source: FocusSource): boolean => {
    const priority = FOCUS_SOURCE_PRIORITY[source];
    if (globalFocusLock && globalFocusLock.priority > priority) return false;
    globalFocusLock = { source, priority };
    return true;
  }, []);

  const releaseFocusLock = useCallback((source: FocusSource) => {
    if (globalFocusLock?.source === source) globalFocusLock = null;
  }, []);

  const forceFocusToScanner = useCallback((source: FocusSource = 'scan') => {
    if (isRefocusing.current) return;
    isRefocusing.current = true;

    const input = getScanInput();
    if (input) {
      input.focus({ preventScroll: true });
      input.setSelectionRange(input.value.length, input.value.length);
      lastFocusTime.current = Date.now();
    }

    isRefocusing.current = false;
  }, [getScanInput]);

  const tryRefocus = useCallback((source: FocusSource = 'scan') => {
    if (!acquireFocusLock(source)) return;
    if (isScanInputFocused()) return;

    const now = Date.now();
    if (now - lastFocusTime.current < 100) return;

    forceFocusToScanner(source);
  }, [acquireFocusLock, isScanInputFocused, forceFocusToScanner]);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      refocusAttempts = 0;
      globalRefocusTimer = setInterval(() => {
        if (refocusAttempts >= REFOCUS_ATTEMPT_LIMIT) {
          if (globalRefocusTimer) clearInterval(globalRefocusTimer);
          return;
        }
        if (!isScanInputFocused()) {
          forceFocusToScanner('scan');
          refocusAttempts++;
        } else {
          if (globalRefocusTimer) clearInterval(globalRefocusTimer);
        }
      }, 200);
    } else {
      if (globalRefocusTimer) {
        clearInterval(globalRefocusTimer);
        globalRefocusTimer = null;
      }
    }
  }, [isScanInputFocused, forceFocusToScanner]);

  useEffect(() => {
    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (globalRefocusTimer) clearInterval(globalRefocusTimer);
    };
  }, [handleVisibilityChange]);

  useEffect(() => {
    observerRef.current = new MutationObserver(() => {
      const input = getScanInput();
      if (!input && globalRefocusTimer) {
        clearInterval(globalRefocusTimer);
        globalRefocusTimer = null;
      }
    });
    observerRef.current.observe(document.body, { childList: true, subtree: true });
    return () => observerRef.current?.disconnect();
  }, [getScanInput]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !isScanInputFocused()) {
        setTimeout(() => forceFocusToScanner('scan'), 0);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isScanInputFocused, forceFocusToScanner]);

  const restoreAfterModal = useCallback(() => {
    requestAnimationFrame(() => forceFocusToScanner('modal'));
  }, [forceFocusToScanner]);

  const restoreAfterToast = useCallback(() => {
    requestAnimationFrame(() => forceFocusToScanner('toast'));
  }, [forceFocusToScanner]);

  const restoreAfterRouteChange = useCallback(() => {
    requestAnimationFrame(() => forceFocusToScanner('route'));
  }, [forceFocusToScanner]);

  const restoreAfterReconnect = useCallback(() => {
    requestAnimationFrame(() => forceFocusToScanner('reconnect'));
  }, [forceFocusToScanner]);

  const restoreAfterSaleComplete = useCallback(() => {
    requestAnimationFrame(() => forceFocusToScanner('sale-complete'));
  }, [forceFocusToScanner]);

  return {
    forceFocusToScanner,
    restoreAfterModal,
    restoreAfterToast,
    restoreAfterRouteChange,
    restoreAfterReconnect,
    restoreAfterSaleComplete,
    isScanInputFocused,
    tryRefocus,
  };
}

export type { FocusSource };
