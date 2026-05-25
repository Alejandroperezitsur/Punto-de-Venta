import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

export default function OfflineState({
  title = 'Sin conexión',
  description = 'No hay conexión a internet. Algunas funciones pueden no estar disponibles.',
  lastSync,
  pendingChanges = 0,
  onRetry,
  className = ''
}) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`flex flex-col items-center justify-center py-16 px-8 rounded-3xl bg-card border border-border ${className}`}
    >
      <motion.div
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="size-16 rounded-2xl bg-warning/10 flex items-center justify-center mb-5"
      >
        <WifiOff className="size-8 text-warning" strokeWidth={1.5} />
      </motion.div>
      <h3 className="text-lg font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">{description}</p>
      <div className="flex items-center gap-4 mb-6">
        {lastSync && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Última sinc.</p>
            <p className="text-sm font-medium">{lastSync}</p>
          </div>
        )}
        {pendingChanges > 0 && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Cambios pend.</p>
            <p className="text-sm font-medium text-warning">{pendingChanges}</p>
          </div>
        )}
      </div>
      {onRetry && (
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button onClick={onRetry}>
            <RefreshCw className="size-4 mr-2" />
            Reintentar conexión
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
