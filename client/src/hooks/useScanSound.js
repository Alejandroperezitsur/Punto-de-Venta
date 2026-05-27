import { useCallback, useRef } from 'react';

const IDLE_CLOSE_MS = 30000;

export const useScanSound = () => {
    const audioContextRef = useRef(null);
    const gainNodeRef = useRef(null);
    const idleTimerRef = useRef(null);

    const closeAudioContext = useCallback(() => {
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            try { audioContextRef.current.close(); } catch {}
        }
        audioContextRef.current = null;
        gainNodeRef.current = null;
    }, []);

    const initAudio = useCallback(() => {
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
        }
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            gainNodeRef.current = audioContextRef.current.createGain();
            gainNodeRef.current.connect(audioContextRef.current.destination);
            gainNodeRef.current.gain.value = 0.25;
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        idleTimerRef.current = setTimeout(closeAudioContext, IDLE_CLOSE_MS);
        return audioContextRef.current;
    }, [closeAudioContext]);

    const playBeep = useCallback((frequency = 1200, duration = 0.08) => {
        try {
            const ctx = initAudio();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

            gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + duration);
        } catch {}
    }, [initAudio]);

    const playSuccess = useCallback(() => {
        playBeep(1200, 0.06);
    }, [playBeep]);

    const playError = useCallback(() => {
        playBeep(400, 0.15);
    }, [playBeep]);

    const playWarning = useCallback(() => {
        playBeep(600, 0.08);
        setTimeout(() => playBeep(600, 0.08), 120);
    }, [playBeep]);

    return { playBeep, playSuccess, playError, playWarning };
};

export default useScanSound;
