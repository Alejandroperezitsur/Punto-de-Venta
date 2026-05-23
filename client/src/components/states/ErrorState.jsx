import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

export default function ErrorState({
  title = 'Algo salió mal',
  description = 'Ocurrió un error al cargar los datos. Intenta de nuevo.',
  error,
  onRetry,
  variant = 'default',
  className = ''
}) {
  const variants = {
    default: 'bg-card',
    danger: 'bg-danger/5',
    warning: 'bg-warning/5',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col items-center justify-center py-16 px-8 rounded-3xl border border-border ${variants[variant]} ${className}`}
    >
      <motion.div
        initial={{ rotate: 0 }}
        animate={{ rotate: [0, -10, 10, -5, 0] }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className={`size-16 rounded-2xl flex items-center justify-center mb-5 ${
          variant === 'danger' ? 'bg-danger/10' : variant === 'warning' ? 'bg-warning/10' : 'bg-muted'
        }`}
      >
        <AlertTriangle className={`size-8 ${variant === 'danger' ? 'text-danger' : variant === 'warning' ? 'text-warning' : 'text-muted-foreground/60'}`} strokeWidth={1.5} />
      </motion.div>
      <h3 className="text-lg font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-2">{description}</p>
      {error && (
        <p className="text-xs text-muted-foreground/60 text-center max-w-sm mb-6 font-mono bg-muted px-3 py-1.5 rounded-xl">
          {error}
        </p>
      )}
      {onRetry && (
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="size-4 mr-2" />
            Reintentar
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
