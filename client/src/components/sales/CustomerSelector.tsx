import React, { useState, useCallback, useRef } from 'react';
import { UserPlus, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useScannerFocusEngine } from '../../hooks/useScannerFocusEngine';

interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
}

export function useCustomerSelector() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);

  const selectCustomer = useCallback((c: Customer) => {
    setSelectedCustomer(c);
    setModalOpen(false);
  }, []);

  const clearCustomer = useCallback(() => setSelectedCustomer(null), []);

  return { selectedCustomer, isModalOpen, setModalOpen, selectCustomer, clearCustomer };
}

export const CustomerSearchModal = React.memo(function CustomerSearchModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (c: Customer) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open || query.trim().length < 2) { setResults([]); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api(`/customers?search=${encodeURIComponent(query.trim())}&take=10`);
        const data = Array.isArray(res) ? res : res.data || [];
        setResults(data);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center pt-[20vh]" role="dialog" aria-modal="true" aria-label="Buscar cliente">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-bg-surface rounded-xl shadow-dialog overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle">
          <UserPlus className="size-4 text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar cliente por nombre o telefono..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
            className="flex-1 text-sm outline-none bg-transparent placeholder:text-text-tertiary text-text-primary font-medium"
            autoFocus
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {loading && <p className="text-center text-text-tertiary text-xs py-4">Buscando...</p>}
          {!loading && query.length >= 2 && results.length === 0 && (
            <p className="text-center text-text-tertiary text-xs py-4">No se encontraron clientes</p>
          )}
          {results.map(c => (
            <button
              key={c.id}
              onClick={() => onSelect({ id: c.id, name: c.name })}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-bg-surface-hover transition-colors"
            >
              <div className="size-9 rounded-full bg-bg-inset flex items-center justify-center text-text-secondary text-xs font-bold shrink-0">
                {c.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate text-text-primary">{c.name}</p>
                {c.phone && <p className="text-xs text-text-tertiary truncate">{c.phone}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

export function CustomerBadge({ customer, onRemove }: { customer: Customer; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-bg border border-accent/15 text-sm">
      <div className="size-7 rounded-full bg-accent-bg flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-accent-text">{customer.name.charAt(0).toUpperCase()}</span>
      </div>
      <span className="font-semibold text-accent-text truncate flex-1 text-xs">{customer.name}</span>
      <button onClick={onRemove} className="text-accent-text/50 hover:text-danger transition-colors shrink-0" aria-label="Quitar cliente">
        <X className="size-3.5" />
      </button>
    </div>
  );
}
