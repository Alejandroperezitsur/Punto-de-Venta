import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, Skull, Activity } from 'lucide-react';
import { cn } from '../../utils/cn';
import { forceSyncNow, getSyncStatusV2 } from '../../lib/syncEngineV2';
import { getHealthMonitor } from '../../lib/healthMonitor';
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

  const qualityColor = networkQuality === 'good' ? 'bg-success' :
    networkQuality === 'degraded' ? 'bg-warning' :
    networkQuality === 'poor' ? 'bg-orange-500' : 'bg-danger';

  const hasErrors = (health?.checks.sync.errorRate ?? 0) > 0 || (deadLetterCount > 0);

  const badgeClass = (base: string, error: boolean) =>
    cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-sm transition-all',
      base,
    );

  const pillClass = (online: boolean, errors: boolean, syncing: boolean) =>
    cn(
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-sm transition-all',
      syncing && 'opacity-70 cursor-wait',
      !online && 'bg-danger/10 text-danger border-danger/20',
      online && errors && 'bg-warning/10 text-warning border-warning/20',
      online && !errors && 'bg-success/10 text-success border-success/20',
    );

  return (
    <div className="flex items-center gap-2 relative">
      {deadLetterCount > 0 && (
        <span className={badgeClass('bg-danger/10 text-danger border-danger/20', true)}>
          <Skull className="size-2.5" />
          {deadLetterCount} muertos
        </span>
      )}
      {pendingCount > 0 && (
        <span className={badgeClass('bg-warning/10 text-warning border-warning/20', false)}>
          {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
        </span>
      )}
      <div className="flex items-center gap-1.5">
        <span className={cn('size-2 rounded-full', qualityColor)} />
        <button
          onClick={handleSync}
          disabled={!isOnline || isSyncing}
          className={pillClass(isOnline, hasErrors, isSyncing)}
          title={isOnline ? `Red: ${networkQuality}. Sync: ${pendingCount} pendientes, ${deadLetterCount} fallos` : "Sin conexión"}
          aria-label={`Estado: ${isOnline ? 'En línea' : 'Sin conexión'}. ${pendingCount} pendientes.`}
        >
          {isSyncing ? (
            <RefreshCw className="size-3 animate-spin" />
          ) : isOnline ? (
            <Wifi className="size-3" />
          ) : (
            <WifiOff className="size-3" />
          )}
          <span>{isOnline ? (isSyncing ? 'Sync...' : networkQuality === 'good' ? 'Online' : networkQuality === 'degraded' ? 'Lenta' : 'Mala') : 'Offline'}</span>
        </button>
      </div>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="p-1.5 rounded-md hover:bg-surface-hover text-muted-foreground transition-colors"
        title="Detalles de salud del sistema"
        aria-label="Detalles de salud"
      >
        <Activity className="size-3.5" />
      </button>
      {showDetails && health && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-card rounded-lg shadow-xl border border-border p-4 z-50 text-xs" role="dialog" aria-label="Detalles de salud">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-bold text-foreground">Servidor:</span>
              <span className={health.checks.server.ok ? 'text-success' : 'text-danger'}>
                {health.checks.server.ok ? `${health.checks.server.latencyMs}ms` : health.checks.server.error}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-foreground">IndexedDB:</span>
              <span className={health.checks.indexedDB.ok ? 'text-success' : 'text-danger'}>
                {health.checks.indexedDB.ok ? `${health.checks.indexedDB.latencyMs}ms` : 'Error'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-foreground">Sync:</span>
              <span className={health.checks.sync.ok ? 'text-success' : 'text-warning'}>
                {pendingCount} pend, {deadLetterCount} fallos
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-foreground">Queue:</span>
              <span className="text-foreground">{health.checks.queue.queueDepth} items</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-foreground">Memoria:</span>
              <span className={health.checks.memory.lowMemory ? 'text-warning' : 'text-success'}>
                {health.checks.memory.usedMB}MB / {health.checks.memory.totalMB}MB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-foreground">Auditoría:</span>
              <span className={health.checks.audit.ok ? 'text-success' : 'text-danger'}>
                {health.checks.audit.chainValid ? `${health.checks.audit.totalEvents} eventos` : '¡Cadena rota!'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-foreground">Red:</span>
              <span className="text-foreground capitalize">{networkQuality}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
