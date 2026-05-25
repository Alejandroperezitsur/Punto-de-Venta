// ─── Log Levels ───

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  source: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  message: string;
  data?: unknown;
  duration?: number;
  error?: string;
}

// ─── Correlation ID ───

let currentCorrelationId: string | null = null;

export function getCorrelationId(): string {
  if (!currentCorrelationId) {
    currentCorrelationId = crypto.randomUUID?.() || 'corr-' + Date.now();
  }
  return currentCorrelationId;
}

export function setCorrelationId(id: string): void {
  currentCorrelationId = id;
}

export function newCorrelationId(): string {
  currentCorrelationId = crypto.randomUUID?.() || 'corr-' + Date.now();
  return currentCorrelationId;
}

// ─── Trace ID ───

let currentTraceId: string | null = null;
let currentSpanId: string | null = null;

export function getTraceContext(): { traceId: string; spanId: string } {
  if (!currentTraceId) {
    currentTraceId = crypto.randomUUID?.() || 'trace-' + Date.now();
  }
  if (!currentSpanId) {
    currentSpanId = crypto.randomUUID?.() || 'span-' + Date.now();
  }
  return { traceId: currentTraceId, spanId: currentSpanId };
}

export function newSpan(): string {
  currentSpanId = crypto.randomUUID?.() || 'span-' + Date.now();
  return currentSpanId;
}

// ─── Logger ───

const MAX_LOG_ENTRIES = 500;
const logHistory: LogEntry[] = [];

function addToHistory(entry: LogEntry): void {
  logHistory.push(entry);
  if (logHistory.length > MAX_LOG_ENTRIES) {
    logHistory.shift();
  }
}

export function getLogHistory(): LogEntry[] {
  return [...logHistory];
}

export function clearLogHistory(): void {
  logHistory.length = 0;
}

function createLogEntry(
  level: LogLevel,
  source: string,
  message: string,
  data?: unknown,
  duration?: number,
  error?: string,
): LogEntry {
  const trace = getTraceContext();
  return {
    timestamp: new Date().toISOString(),
    level,
    source,
    correlationId: getCorrelationId(),
    traceId: trace.traceId,
    spanId: trace.spanId,
    message,
    data,
    duration,
    error,
  };
}

function emitLog(entry: LogEntry): void {
  addToHistory(entry);

  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.source}]`;
  const suffix = entry.duration !== undefined ? ` (${entry.duration}ms)` : '';

  if (entry.level === 'error') {
    console.error(`${prefix} ${entry.message}${suffix}`, entry.data || '', entry.error || '');
  } else if (entry.level === 'warn') {
    console.warn(`${prefix} ${entry.message}${suffix}`, entry.data || '');
  } else if (entry.level === 'debug') {
    console.debug(`${prefix} ${entry.message}${suffix}`, entry.data || '');
  } else {
    console.log(`${prefix} ${entry.message}${suffix}`, entry.data || '');
  }

  try {
    window.dispatchEvent(
      new CustomEvent('app-log', { detail: entry }),
    );
  } catch {
    // ignore dispatch errors
  }
}

// ─── Timer ───

const timers = new Map<string, number>();

export function startTimer(label: string): void {
  timers.set(label, performance.now());
}

export function endTimer(label: string, source: string, message: string, data?: unknown): number {
  const start = timers.get(label);
  if (start === undefined) return 0;
  const duration = performance.now() - start;
  timers.delete(label);
  emitLog(createLogEntry('info', source, message, data, Math.round(duration)));
  return Math.round(duration);
}

// ─── Logger Factory ───

export interface Logger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, error?: unknown) => void;
  timed: <T>(label: string, message: string, fn: () => Promise<T>, data?: unknown) => Promise<T>;
}

export function createLogger(source: string): Logger {
  return {
    debug: (message: string, data?: unknown) => {
      emitLog(createLogEntry('debug', source, message, data));
    },
    info: (message: string, data?: unknown) => {
      emitLog(createLogEntry('info', source, message, data));
    },
    warn: (message: string, data?: unknown) => {
      emitLog(createLogEntry('warn', source, message, data));
    },
    error: (message: string, error?: unknown) => {
      const errMsg = error instanceof Error ? error.message : error !== undefined ? String(error) : undefined;
      emitLog(createLogEntry('error', source, message, undefined, undefined, errMsg));
    },
    timed: async <T>(label: string, message: string, fn: () => Promise<T>, data?: unknown): Promise<T> => {
      startTimer(label);
      try {
        const result = await fn();
        endTimer(label, source, message, data);
        return result;
      } catch (e) {
        const duration = performance.now() - (timers.get(label) || performance.now());
        timers.delete(label);
        const errMsg = e instanceof Error ? e.message : String(e);
        emitLog(createLogEntry('error', source, `${message} FAILED`, data, Math.round(duration), errMsg));
        throw e;
      }
    },
  };
}

// ─── Global Error Handler ───

export function initGlobalErrorHandler(): void {
  window.addEventListener('error', (event) => {
    const entry = createLogEntry(
      'error',
      'GlobalErrorHandler',
      event.message || 'Uncaught error',
      undefined,
      undefined,
      event.filename ? `${event.filename}:${event.lineno}` : undefined,
    );
    emitLog(entry);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
    const entry = createLogEntry('error', 'UnhandledRejection', reason);
    emitLog(entry);
  });

  console.log('[Logger] Global error handler initialized');
}
