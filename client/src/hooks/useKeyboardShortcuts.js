import { useEffect } from 'react';

export const useKeyboardShortcuts = (shortcuts) => {
    useEffect(() => {
        const handleKeyDown = (event) => {
            // Ignore if inside input/textarea unless it's a special global key like F-keys or ESC
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                if (!['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(event.key)) {
                    return;
                }
            }

            const combo = [
                event.ctrlKey ? 'Ctrl' : '',
                event.shiftKey ? 'Shift' : '',
                event.altKey ? 'Alt' : '',
                event.key
            ].filter(Boolean).join('+');

            // Simple key check
            const handler = shortcuts[event.key] || shortcuts[combo];
            if (handler) {
                event.preventDefault();
                handler(event);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
};
