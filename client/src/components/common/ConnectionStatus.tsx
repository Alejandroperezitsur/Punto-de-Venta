import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';

export const ConnectionStatus = React.memo(function ConnectionStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleSyncing = () => setSyncing(true);
    const handleSynced = () => setSyncing(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-start', handleSyncing);
    window.addEventListener('sync-end', handleSynced);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-start', handleSyncing);
      window.removeEventListener('sync-end', handleSynced);
    };
  }, []);

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-inset text-xs font-medium">
      {syncing ? (
        <RefreshCw className="size-3 animate-spin text-info" />
      ) : online ? (
        <Wifi className="size-3 text-success" />
      ) : (
        <WifiOff className="size-3 text-warning" />
      )}
      <span className={cn(
        'text-text-tertiary',
        !online && 'text-warning-text',
        syncing && 'text-info-text',
      )}>
        {syncing ? 'Sinc...' : online ? 'Online' : 'Offline'}
      </span>
    </div>
  );
});
