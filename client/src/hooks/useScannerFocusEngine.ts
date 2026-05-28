import { useEffect, useRef, useCallback } from 'react';

type FocusSource = 'scan' | 'modal' | 'toast' | 'route' | 'reconnect' | 'sale-complete' | 'manual';

interface FocusLock {
  source: FocusSource;
  priority: number;
  acquiredAt: number;
}

const FOCUS_SOURCE_PRIORITY: Record<FocusSource, number> = {
  scan: 100,
  'sale-complete': 99,
  manual: 98,
  modal: 50,
  toast: 40,
  route: 30,
  reconnect: 20,
};

const SCAN_INPUT_SELECTOR = '[data-scan-input]';

export function useScannerFocusEngine() {
  const focusLockRef = useRef<FocusLock | null>(null);
  const refocusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refocusAttemptsRef = useRef(0);
  const lastFocusTime = useRef(0);
  const observerRef = useRef<MutationObserver | null>(null);
  const isRefocusing = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getScanInput = useCallback((): HTMLInputElement | null => {
    return document.querySelector<HTMLInputElement>(SCAN_INPUT_SELECTOR);
  }, []);

  const isScanInputFocused = useCallback((): boolean => {
    const input = getScanInput();
    return input === document.activeElement;
  }, [getScanInput]);

  const acquireFocusLock = useCallback((source: FocusSource): boolean => {
    const priority = FOCUS_SOURCE_PRIORITY[source];
    if (focusLockRef.current && focusLockRef.current.priority > priority) return false;
    focusLockRef.current = { source, priority, acquiredAt: Date.now() };
    return true;
  }, []);

  const releaseFocusLock = useCallback((source: FocusSource) => {
    if (focusLockRef.current?.source === source) focusLockRef.current = null;
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
      refocusAttemptsRef.current = 0;
      if (refocusTimerRef.current) clearInterval(refocusTimerRef.current);
      refocusTimerRef.current = setInterval(() => {
        if (refocusAttemptsRef.current >= 1) {
          if (refocusTimerRef.current) clearInterval(refocusTimerRef.current);
          return;
        }
        if (!isScanInputFocused()) {
          forceFocusToScanner('scan');
          refocusAttemptsRef.current++;
        } else {
          if (refocusTimerRef.current) clearInterval(refocusTimerRef.current);
        }
      }, 200);
    } else {
      if (refocusTimerRef.current) {
        clearInterval(refocusTimerRef.current);
        refocusTimerRef.current = null;
      }
    }
  }, [isScanInputFocused, forceFocusToScanner]);

  useEffect(() => {
    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (refocusTimerRef.current) clearInterval(refocusTimerRef.current);
    };
  }, [handleVisibilityChange]);

  useEffect(() => {
    const scanInput = getScanInput();
    const container = scanInput?.parentElement || document.querySelector('#main-content') || document.body;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    observerRef.current = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const input = getScanInput();
        if (!input && refocusTimerRef.current) {
          clearInterval(refocusTimerRef.current);
          refocusTimerRef.current = null;
        }
      }, 300);
    });
    observerRef.current.observe(container, { childList: true, subtree: true });
    return () => {
      observerRef.current?.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [getScanInput]);

  const isScanInputFocusedRef = useRef(isScanInputFocused);
  isScanInputFocusedRef.current = isScanInputFocused;

  const forceFocusToScannerRef = useRef(forceFocusToScanner);
  forceFocusToScannerRef.current = forceFocusToScanner;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !isScanInputFocusedRef.current) {
        setTimeout(() => forceFocusToScannerRef.current('scan'), 0);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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
