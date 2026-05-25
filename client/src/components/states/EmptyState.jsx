import React from 'react';
import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import { Button } from '../ui/Button';

export default function EmptyState({ 
  icon: Icon = Inbox, 
  title = 'Sin datos', 
  description = 'No hay información disponible para mostrar.',
  action,
  actionLabel = 'Crear nuevo',
  onAction,
  variant = 'default',
  className = ''
}) {
  const variants = {
    default: 'bg-card',
    muted: 'bg-muted',
    ghost: 'bg-transparent',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col items-center justify-center py-16 px-8 rounded-3xl ${variants[variant]} border border-dashed border-border ${className}`}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
        className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-5"
      >
        <Icon className="size-8 text-muted-foreground/60" strokeWidth={1.5} />
      </motion.div>
      <h3 className="text-lg font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">{description}</p>
      {action && (
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button onClick={onAction}>{actionLabel}</Button>
        </motion.div>
      )}
    </motion.div>
  );
}
