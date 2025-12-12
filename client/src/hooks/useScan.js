import { useEffect } from 'react';

export const useScan = (onScan) => {
    useEffect(() => {
        let buffer = '';
        let lastKeyTime = Date.now();

        const handleKeyDown = (e) => {
            const now = Date.now();
            const char = e.key;

            // Ignore special keys except Enter
            if (char.length > 1 && char !== 'Enter') return;

            // If time between keystrokes is too long (>100ms), it's likely manual typing, so reset buffer
            // But we must be careful not to reset if it's the start of a scan
            if (now - lastKeyTime > 100) {
                buffer = '';
            }

            lastKeyTime = now;

            if (char === 'Enter') {
                if (buffer.length > 2) { // Minimum length to consider it a barcode
                    onScan(buffer);
                    // Prevent default form submission if focused on an input
                    // e.preventDefault(); 
                }
                buffer = '';
            } else {
                buffer += char;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onScan]);
};
