import { useEffect, useCallback } from 'react';

type SignalState = 'idle' | 'operating' | 'offline' | 'syncing' | 'error';

let currentState: SignalState = 'idle';

function updateSignalBar(state: SignalState) {
  currentState = state;
  const bar = document.getElementById('signal-bar');
  if (!bar) return;
  bar.className = `signal-bar${state !== 'idle' ? ` signal-bar--${state}` : ''}`;
}

export function useSignalBar() {
  const setSignal = useCallback((state: SignalState) => {
    updateSignalBar(state);
  }, []);

  useEffect(() => {
    const handleOnline = () => updateSignalBar(currentState === 'offline' ? 'syncing' : 'idle');
    const handleOffline = () => updateSignalBar('offline');
    const handleCashOpen = () => updateSignalBar('operating');
    const handleCashClose = () => updateSignalBar('idle');
    const handleSyncStart = () => updateSignalBar('syncing');
    const handleSyncEnd = () => updateSignalBar(currentState === 'offline' ? 'offline' : 'idle');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('cash-status', ((e: CustomEvent) => {
      updateSignalBar(e.detail?.session ? 'operating' : 'idle');
    }) as EventListener);
    window.addEventListener('sync-start', handleSyncStart);
    window.addEventListener('sync-end', handleSyncEnd);

    if (!navigator.onLine) updateSignalBar('offline');

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-start', handleSyncStart);
      window.removeEventListener('sync-end', handleSyncEnd);
    };
  }, []);

  return { setSignal, current: currentState };
}
