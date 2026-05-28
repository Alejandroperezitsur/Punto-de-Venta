import React, { useState, useEffect, useCallback, memo } from 'react';
import { Wifi, WifiOff, RefreshCw, Activity } from 'lucide-react';
import { cn } from '../../utils/cn';
import { forceSyncNow, getSyncStatusV2 } from '../../lib/syncEngineV2';
import { getHealthMonitor } from '../../lib/healthMonitor';
import type { HealthStatus } from '../../lib/healthMonitor';

export const ConnectionStatus: React.FC = memo(function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [networkQuality, setNetworkQuality] = useState<string>('good');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const status = await getSyncStatusV2();
      setPendingCount(status.queueStats.pending);
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

    const interval = setInterval(refresh, 30000);
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

  const getStatusLabel = (): { label: string; variant: string } => {
    if (!isOnline) return { label: 'Sin conexión', variant: 'offline' };
    if (isSyncing) return { label: 'Guardando...', variant: 'syncing' };
    if (pendingCount > 0) return { label: `${pendingCount} cambio${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''}`, variant: 'pending' };
    if (networkQuality === 'degraded' || networkQuality === 'poor') return { label: 'Conexión lenta', variant: 'degraded' };
    return { label: 'En línea', variant: 'online' };
  };

  const status = getStatusLabel();

  const variantStyles = {
    online: 'bg-success/10 text-success border-success/20',
    syncing: 'bg-primary/10 text-primary border-primary/20',
    pending: 'bg-warning/10 text-warning border-warning/20',
    degraded: 'bg-warning/10 text-warning border-warning/20',
    offline: 'bg-danger/10 text-danger border-danger/20',
  };

  const handleDetailsClick = useCallback(() => {
    setShowDetails(!showDetails);
  }, []);

  return (
    <div className="flex items-center gap-2 relative">
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleSync}
          disabled={!isOnline || isSyncing}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-sm transition-all',
            isSyncing && 'opacity-70 cursor-wait',
            variantStyles[status.variant as keyof typeof variantStyles],
          )}
          title={isOnline ? `${pendingCount} cambio${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''}` : 'Sin conexión'}
          aria-label={`Estado: ${status.label}`}
        >
          {isSyncing ? (
            <RefreshCw className="size-3 animate-spin" />
          ) : isOnline ? (
            <Wifi className="size-3" />
          ) : (
            <WifiOff className="size-3" />
          )}
          <span>{status.label}</span>
        </button>
      </div>
      <button
        onClick={handleDetailsClick}
        className="p-1.5 rounded-md hover:bg-surface-hover text-muted-foreground transition-colors"
        title="Detalles del sistema"
        aria-label="Detalles del sistema"
      >
        <Activity className="size-3.5" />
      </button>
      {showDetails && health && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-card rounded-lg shadow-xl border border-border p-4 z-50 text-xs" role="dialog" aria-label="Detalles del sistema">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-bold text-foreground">Servidor:</span>
              <span className={health.checks.server.ok ? 'text-success' : 'text-danger'}>
                {health.checks.server.ok ? `${health.checks.server.latencyMs}ms` : 'Desconectado'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-foreground">Datos locales:</span>
              <span className={health.checks.indexedDB.ok ? 'text-success' : 'text-danger'}>
                {health.checks.indexedDB.ok ? 'Funcionando' : 'Error'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-foreground">Sincronización:</span>
              <span className={health.checks.sync.ok ? 'text-success' : 'text-warning'}>
                {pendingCount} pendientes
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-foreground">Cola:</span>
              <span className="text-foreground">{health.checks.queue.queueDepth} elementos</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-foreground">Memoria:</span>
              <span className={health.checks.memory.lowMemory ? 'text-warning' : 'text-success'}>
                {health.checks.memory.usedMB}MB / {health.checks.memory.totalMB}MB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-foreground">Red:</span>
              <span className="text-foreground capitalize">
                {networkQuality === 'good' ? 'Buena' : networkQuality === 'degraded' ? 'Regular' : 'Mala'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
