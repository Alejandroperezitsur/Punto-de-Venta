import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';
import { syncAll } from '../../lib/syncManager';
import { getUnsyncedSales, getUnsyncedMovements } from '../../lib/db';

export const ConnectionStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const checkPending = useCallback(async () => {
    try {
      const sales = await getUnsyncedSales();
      const movs = await getUnsyncedMovements();
      setPendingCount(sales.length + movs.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); checkPending(); };
    const handleOffline = () => { setIsOnline(false); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    checkPending();

    const handleSyncComplete = () => {
      setIsSyncing(false);
      checkPending();
    };
    window.addEventListener('sync-complete', handleSyncComplete);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-complete', handleSyncComplete);
    };
  }, [checkPending]);

  const handleSync = async () => {
    setIsSyncing(true);
    await syncAll();
  };

  return (
    <div className="flex items-center gap-2">
      {pendingCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
          {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={!isOnline || isSyncing}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-sm transition-all",
          isOnline
            ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200"
            : "bg-rose-100 text-rose-700 border-rose-200",
          isSyncing && "opacity-70 cursor-wait"
        )}
        title={isOnline ? "Haz clic para sincronizar" : "Sin conexión"}
        aria-label={`Estado de conexión: ${isOnline ? 'En línea' : 'Sin conexión'}. ${pendingCount} operaciones pendientes.`}
      >
        {isSyncing ? (
          <RefreshCw className="h-3 w-3 animate-spin" />
        ) : isOnline ? (
          <Wifi className="h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        <span>{isOnline ? (isSyncing ? 'Sincronizando...' : 'En línea') : 'Sin conexión'}</span>
      </button>
    </div>
  );
};
