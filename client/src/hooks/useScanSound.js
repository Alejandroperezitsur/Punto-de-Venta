import { useCallback, useRef } from 'react';

/**
 * Hook for playing scan beep sounds
 * Uses Web Audio API for instant sound playback
 */
export const useScanSound = () => {
    const audioContextRef = useRef(null);
    const gainNodeRef = useRef(null);

    const initAudio = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            gainNodeRef.current = audioContextRef.current.createGain();
            gainNodeRef.current.connect(audioContextRef.current.destination);
            gainNodeRef.current.gain.value = 0.3;
        }
        return audioContextRef.current;
    }, []);

    const playBeep = useCallback((frequency = 1200, duration = 0.15) => {
        try {
            const ctx = initAudio();
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + duration);
        } catch (e) {
            console.warn('Audio playback failed:', e);
        }
    }, [initAudio]);

    const playSuccess = useCallback(() => {
        playBeep(1200, 0.1);
        setTimeout(() => playBeep(1500, 0.1), 100);
    }, [playBeep]);

    const playError = useCallback(() => {
        playBeep(400, 0.2);
    }, [playBeep]);

    const playWarning = useCallback(() => {
        playBeep(600, 0.1);
        setTimeout(() => playBeep(600, 0.1), 150);
    }, [playBeep]);

    return {
        playBeep,
        playSuccess,
        playError,
        playWarning,
    };
};

export default useScanSound;
