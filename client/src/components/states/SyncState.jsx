import React from 'react';
import { motion } from 'framer-motion';
import { Cloud, CloudOff, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';

const statusConfig = {
  syncing: {
    icon: Loader2,
    label: 'Sincronizando...',
    variant: 'info',
    color: 'text-info',
    spin: true,
  },
  success: {
    icon: CheckCircle2,
    label: 'Sincronizado',
    variant: 'success',
    color: 'text-success',
    spin: false,
  },
  error: {
    icon: AlertCircle,
    label: 'Error de sincronización',
    variant: 'danger',
    color: 'text-danger',
    spin: false,
  },
  offline: {
    icon: CloudOff,
    label: 'Sin conexión',
    variant: 'warning',
    color: 'text-warning',
    spin: false,
  },
};

export default function SyncState({
  status = 'success',
  lastSync,
  itemsCount = 0,
  className = '',
}) {
  const config = statusConfig[status] || statusConfig.success;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-card border border-border ${className}`}
    >
      <motion.div
        animate={config.spin ? { rotate: 360 } : {}}
        transition={config.spin ? { duration: 1.5, repeat: Infinity, ease: 'linear' } : {}}
      >
        <Icon className={`size-4 ${config.color}`} strokeWidth={2} />
      </motion.div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{config.label}</span>
          <Badge variant={config.variant} size="sm">{status}</Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {lastSync && <span>Última sinc: {lastSync}</span>}
          {itemsCount > 0 && <span>{itemsCount} elementos</span>}
        </div>
      </div>
      {status === 'syncing' && (
        <div className="flex gap-1">
          <motion.div animate={{ scaleY: [1, 2, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} className="w-1 h-3 bg-info rounded-full" />
          <motion.div animate={{ scaleY: [1, 2, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} className="w-1 h-3 bg-info rounded-full" />
          <motion.div animate={{ scaleY: [1, 2, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} className="w-1 h-3 bg-info rounded-full" />
        </div>
      )}
    </motion.div>
  );
}
