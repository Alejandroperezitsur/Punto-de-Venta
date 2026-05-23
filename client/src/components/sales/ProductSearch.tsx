import React, { useState, useCallback } from 'react';
import { Search, Loader2, Plus } from 'lucide-react';
import { Input } from '../common/Input';
import { useScan } from '../../hooks/useScan';
import { useScanSound } from '../../hooks/useScanSound';
import { api } from '../../lib/api';
import { useCartStore } from '../../store/cartStore';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';

export const ProductSearch: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const addItem = useCartStore(state => state.addItem);
    const { playSuccess, playError, playWarning } = useScanSound();

    const handleScan = useCallback(async (code: string, qty = 1) => {
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

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        let code = query;
        let qty = 1;
        const match = query.match(/^(\d+)\*(.+)$/);
        if (match) {
            qty = parseInt(match[1], 10);
            code = match[2];
        }

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
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full relative">
            <form onSubmit={handleSearch} role="search" aria-label="Buscar producto">
                <Input
                    icon={loading ? Loader2 : Search}
                    placeholder="Escanear producto o buscar por nombre..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (error) setError('');
                    }}
                    disabled={loading}
                    autoFocus
                    className={cn(loading && "animate-pulse")}
                    data-scan-input="true"
                    aria-label="Buscar o escanear producto"
                />
            </form>
            
            {error && (
                <div className="absolute top-full left-0 right-0 mt-2 z-10 animate-in slide-in-from-top-2 duration-200" role="alert">
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                                <Plus className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-orange-800 uppercase tracking-tight">Producto no encontrado</p>
                                <p className="text-xs font-bold text-orange-600">Quieres agregarlo rapidamente?</p>
                            </div>
                        </div>
                        <Button 
                            onClick={handleQuickCreate}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 rounded-xl h-12"
                            aria-label={`Agregar "${error}" como producto manual`}
                        >
                            Agregar "{error}"
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
