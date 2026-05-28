import { useRef, useCallback, useEffect } from 'react';

interface ScanBufferOptions {
  minLength?: number;
  timeout?: number;
  dedupWindow?: number;
  maxBufferSize?: number;
}

interface QueuedScan {
  code: string;
  quantity: number;
  timestamp: number;
  sequence: number;
  id: string;
}

interface ScanSession {
  id: string;
  startTime: number;
  scanCount: number;
  lastScanTime: number;
}

const DEFAULT_OPTIONS: Required<ScanBufferOptions> = {
  minLength: 3,
  timeout: 100,
  dedupWindow: 400,
  maxBufferSize: 50,
};

let globalSequence = 0;

export function useScanBuffer(
  onScan: (code: string, quantity?: number) => void,
  onScannerIdle?: () => void,
  options: ScanBufferOptions = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const lastScannedCodeRef = useRef('');
  const lastScanTimeRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<QueuedScan[]>([]);
  const processingRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onIdleRef = useRef(onScannerIdle);
  const enabledRef = useRef(true);
  const sessionRef = useRef<ScanSession>({
    id: crypto.randomUUID?.() || Date.now().toString(),
    startTime: Date.now(),
    scanCount: 0,
    lastScanTime: 0,
  });

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => { onIdleRef.current = onScannerIdle; }, [onScannerIdle]);

  const clearTimers = useCallback(() => {
    if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => onIdleRef.current?.(), 5000);
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) return;
    processingRef.current = true;

    const batch = queueRef.current.splice(0, Math.min(queueRef.current.length, 5));
    for (const item of batch) {
      try {
        await onScanRef.current(item.code, item.quantity);
      } catch {
        // Scanner must be resilient — log but don't crash
      }
    }

    processingRef.current = false;
    if (queueRef.current.length > 0) {
      requestAnimationFrame(() => processQueue());
    }
  }, []);

  const enqueueScan = useCallback((code: string, quantity: number) => {
    const now = Date.now();
    const seq = ++globalSequence;
    if (queueRef.current.length >= opts.maxBufferSize) queueRef.current.shift();
    queueRef.current.push({ code, quantity, timestamp: now, sequence: seq, id: `${seq}-${code}` });

    const session = sessionRef.current;
    session.scanCount++;
    session.lastScanTime = now;

    processQueue();
  }, [processQueue, opts.maxBufferSize]);

  const flushBuffer = useCallback(() => {
    const buffer = bufferRef.current;
    bufferRef.current = '';

    if (buffer.length < opts.minLength) return;

    const now = Date.now();
    if (buffer === lastScannedCodeRef.current && now - lastScanTimeRef.current < opts.dedupWindow) return;

    lastScannedCodeRef.current = buffer;
    lastScanTimeRef.current = now;

    const qtyMatch = buffer.match(/^(\d{1,3})\*(.+)$/);
    if (qtyMatch) {
      const qty = parseInt(qtyMatch[1], 10);
      const barcode = qtyMatch[2];
      enqueueScan(barcode, qty);
    } else {
      enqueueScan(buffer, 1);
    }

    resetIdleTimer();
  }, [opts.minLength, opts.dedupWindow, enqueueScan, resetIdleTimer]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabledRef.current) return;
    if (e.repeat) return;

    const target = e.target as HTMLElement;
    const tag = target?.tagName;
    const isFormField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    const isContentEditable = target?.isContentEditable;
    const isScanInput = target?.dataset?.scanInput === 'true';

    if (isFormField && !isScanInput) return;
    if (isContentEditable) return;

    const key = e.key;
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(key)) return;

    if (key === 'Tab') return;
    if (key === 'Enter') {
      if (bufferRef.current.length >= opts.minLength) {
        e.preventDefault();
        e.stopPropagation();
        clearTimers();
        flushBuffer();
        lastKeyTimeRef.current = 0;
      } else {
        bufferRef.current = '';
        lastKeyTimeRef.current = 0;
      }
      return;
    }

    if (key.length === 1) {
      const now = Date.now();
      if (now - lastKeyTimeRef.current > opts.timeout || lastKeyTimeRef.current === 0) {
        bufferRef.current = '';
      }

      bufferRef.current += key;
      lastKeyTimeRef.current = now;

      clearTimers();
      flushTimerRef.current = setTimeout(() => { flushBuffer(); }, opts.timeout * 3);
      resetIdleTimer();
    }
  }, [opts.minLength, opts.timeout, clearTimers, flushBuffer, resetIdleTimer]);

  return {
    handleKeyDown,
    clearTimers,
    resetIdleTimer,
    isBufferEmpty: bufferRef.current.length === 0,
  };
}

export function isScannerEvent(e: KeyboardEvent): boolean {
  const interval = e.timeStamp - (e as any)._lastTime;
  (e as any)._lastTime = e.timeStamp;
  return !e.repeat && e.key.length === 1 && interval < 50;
}
