import { useEffect, useRef, useCallback } from 'react';

export const useScan = (onScan, options = {}) => {
    const {
        minLength = 3,
        timeout = 100,
        enabled = true
    } = options;

    const onScanRef = useRef(onScan);

    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    useEffect(() => {
        if (!enabled) return;

        let buffer = '';
        let lastKeyTime = 0;
        let flushTimer = null;

        const handleKeyDown = (e) => {
            if (e.repeat) return;

            // Ignore if focus is on a text/number input (user is typing manually)
            const tag = e.target.tagName;
            const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
            const isScanInput = e.target.dataset?.scanInput === 'true';

            // If user is typing in a regular input, don't scan
            if (isInput && !isScanInput) return;

            const now = Date.now();
            const char = e.key;

            // Special keys reset the buffer
            if (char === 'Shift' || char === 'Control' || char === 'Alt' || char === 'Meta' || char === 'CapsLock' || char === 'Tab') return;

            // If it's a single character key, it could be a scanner
            if (char.length === 1) {
                // If too much time passed, start a new buffer (new scan)
                if (now - lastKeyTime > timeout || lastKeyTime === 0) {
                    buffer = '';
                }

                buffer += char;
                lastKeyTime = now;

                // Clear previous flush timer
                if (flushTimer) clearTimeout(flushTimer);

                // Set a safety flush timer in case Enter is not sent
                flushTimer = setTimeout(() => {
                    if (buffer.length >= minLength) {
                        onScanRef.current(buffer);
                    }
                    buffer = '';
                    flushTimer = null;
                }, timeout * 3);
            }

            // Enter key = end of barcode
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
