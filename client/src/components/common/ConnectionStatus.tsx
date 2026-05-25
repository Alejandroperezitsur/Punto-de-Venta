import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, Skull, Activity } from 'lucide-react';
import { cn } from '../../utils/cn';
import { forceSyncNow, getSyncStatusV2 } from '../../lib/syncEngineV2';
import { getHealthMonitor } from '../../lib/healthMonitor';
import { getLogHistory } from '../../lib/structuredLogger';
import type { HealthStatus } from '../../lib/healthMonitor';

export const ConnectionStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [deadLetterCount, setDeadLetterCount] = useState(0);
  const [networkQuality, setNetworkQuality] = useState<string>('good');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const status = await getSyncStatusV2();
      setPendingCount(status.queueStats.pending);
      setDeadLetterCount(status.queueStats.deadLetterCount);
      setNetworkQuality(status.networkQuality);
      setHealth((await getHealthMonitor().check()));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); refresh(); };
    const handleOffline = () => { setIsOnline(false); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    refresh();

    const handleSyncComplete = () => {
      setIsSyncing(false);
      refresh();
    };
    window.addEventListener('sync-complete', handleSyncComplete);
    window.addEventListener('health-status', ((e: CustomEvent) => {
      setHealth(e.detail);
    }) as EventListener);

    const interval = setInterval(refresh, 15000);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-complete', handleSyncComplete);
      clearInterval(interval);
    };
  }, [refresh]);

  const handleSync = async () => {
    setIsSyncing(true);
    await forceSyncNow();
    setTimeout(() => setIsSyncing(false), 2000);
  };

  const qualityColor = networkQuality === 'good' ? 'bg-emerald-500' :
    networkQuality === 'degraded' ? 'bg-amber-500' :
    networkQuality === 'poor' ? 'bg-orange-500' : 'bg-red-500';

  const hasErrors = (health?.checks.sync.errorRate ?? 0) > 0 || (deadLetterCount > 0);

  return (
    <div className="flex items-center gap-2 relative">
      {deadLetterCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
          <Skull className="h-2.5 w-2.5" />
          {deadLetterCount} muertos
        </span>
      )}
      {pendingCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
          {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
        </span>
      )}
      <div className="flex items-center gap-1">
        <span className={cn('h-2 w-2 rounded-full', qualityColor)} />
        <button
          onClick={handleSync}
          disabled={!isOnline || isSyncing}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-sm transition-all",
            isOnline
              ? hasErrors
                ? "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200"
                : "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200"
              : "bg-rose-100 text-rose-700 border-rose-200",
            isSyncing && "opacity-70 cursor-wait"
          )}
          title={isOnline ? `Red: ${networkQuality}. Sync: ${pendingCount} pendientes, ${deadLetterCount} fallos` : "Sin conexión"}
          aria-label={`Estado: ${isOnline ? 'En línea' : 'Sin conexión'}. ${pendingCount} pendientes.`}
        >
          {isSyncing ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : isOnline ? (
            <Wifi className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          <span>{isOnline ? (isSyncing ? 'Sync...' : networkQuality === 'good' ? 'Online' : networkQuality === 'degraded' ? 'Lenta' : 'Mala') : 'Offline'}</span>
        </button>
      </div>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="p-1 rounded-md hover:bg-gray-100 text-gray-400"
        title="Detalles de salud del sistema"
        aria-label="Detalles de salud"
      >
        <Activity className="h-3.5 w-3.5" />
      </button>
      {showDetails && health && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50 text-xs" role="dialog" aria-label="Detalles de salud">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-bold">Servidor:</span>
              <span className={health.checks.server.ok ? 'text-emerald-600' : 'text-red-600'}>
                {health.checks.server.ok ? `${health.checks.server.latencyMs}ms` : health.checks.server.error}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">IndexedDB:</span>
              <span className={health.checks.indexedDB.ok ? 'text-emerald-600' : 'text-red-600'}>
                {health.checks.indexedDB.ok ? `${health.checks.indexedDB.latencyMs}ms` : 'Error'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Sync:</span>
              <span className={health.checks.sync.ok ? 'text-emerald-600' : 'text-amber-600'}>
                {pendingCount} pend, {deadLetterCount} fallos
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Queue:</span>
              <span>{health.checks.queue.queueDepth} items</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Memoria:</span>
              <span className={health.checks.memory.lowMemory ? 'text-amber-600' : 'text-emerald-600'}>
                {health.checks.memory.usedMB}MB / {health.checks.memory.totalMB}MB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Auditoría:</span>
              <span className={health.checks.audit.ok ? 'text-emerald-600' : 'text-red-600'}>
                {health.checks.audit.chainValid ? `${health.checks.audit.totalEvents} eventos` : '¡Cadena rota!'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Red:</span>
              <span className="capitalize">{networkQuality}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
