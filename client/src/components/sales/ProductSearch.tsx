import React, { useState, useCallback } from 'react';
import { Search, Loader2, Plus, Barcode } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useScan } from '../../hooks/useScan';
import { useScanSound } from '../../hooks/useScanSound';
import { api } from '../../lib/api';
import { useCartStore } from '../../store/cartStore';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

export const ProductSearch = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const addItem = useCartStore(state => state.addItem);
  const { playSuccess, playError, playWarning } = useScanSound();

  const handleScan = useCallback(async (code, qty = 1) => {
    setLoading(true);
    setError('');
    try {
      const product = await api(`/products/scan/${encodeURIComponent(code)}`);
      if (product) {
        addItem(product, qty);
        setQuery('');
        playSuccess();
        if (navigator.vibrate) navigator.vibrate(15);
      }
    } catch {
      setError(code);
      playWarning();
    } finally {
      setLoading(false);
    }
  }, [addItem, playSuccess, playWarning]);

  useScan(handleScan);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    let code = query;
    let qty = 1;
    const match = query.match(/^(\d+)\*(.+)$/);
    if (match) { qty = parseInt(match[1], 10); code = match[2]; }
    await handleScan(code, qty);
  };

  const handleQuickCreate = async () => {
    if (!error) return;
    setLoading(true);
    try {
      addItem({
        id: `temp-${Date.now()}`,
        name: error,
        price: 0,
        sku: error,
        isNew: true,
        quantity: 1,
      });
      setError('');
      setQuery('');
      playSuccess();
    } finally { setLoading(false); }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSearch} role="search" aria-label="Buscar producto">
        <Input
          icon={Barcode}
          scanner
          placeholder="Escanear o buscar producto..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (error) setError(''); }}
          disabled={loading}
          autoFocus
          className={cn(loading && 'animate-pulse')}
          data-scan-input="true"
          aria-label="Buscar o escanear producto"
        />
      </form>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="absolute top-full left-0 right-0 mt-2 z-10"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-warning/10 border-2 border-warning/20 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-xl bg-warning/20 flex items-center justify-center shrink-0">
                  <Plus className="size-5 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-warning truncate">Producto no encontrado</p>
                  <p className="text-xs font-semibold text-warning/70">¿Agregarlo rápidamente?</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="warning"
                onClick={handleQuickCreate}
                className="shrink-0 font-bold"
                aria-label={`Agregar "${error}" como producto manual`}
              >
                + Agregar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
