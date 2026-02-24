import React, { useState } from 'react';
import { Search, Loader2, Plus, Zap } from 'lucide-react';
import { Input } from '../common/Input';
import { useScan } from '../../hooks/useScan';
import { api } from '../../lib/api';
import { useCartStore } from '../../store/useCartStore';
import { Button } from '../common/Button';

export const ProductSearch = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const addItem = useCartStore(state => state.addItem);

    const handleScan = async (code, qty = 1) => {
        setLoading(true);
        setError('');
        try {
            const product = await api(`/products/scan/${code}`);
            if (product) {
                addItem(product, qty);
                setQuery('');
            }
        } catch (e) {
            setError(code); // Store the failed code to offer creation
        } finally {
            setLoading(false);
        }
    };

    useScan(handleScan);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        // Fast Scan Logic: 3*code
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
            // Create a temporary product in the cart immediately
            addItem({
                id: `temp-${Date.now()}`,
                name: error,
                price: 0,
                sku: error,
                isNew: true
            });
            setError('');
            setQuery('');
            // Focus on the price input of the last item in cart? 
            // For now, just adding it is a huge win.
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full relative">
            <form onSubmit={handleSearch}>
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
                />
            </form>
            
            {error && (
                <div className="absolute top-full left-0 right-0 mt-2 z-10 animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                                <Plus className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-orange-800 uppercase tracking-tight">Producto no encontrado</p>
                                <p className="text-xs font-bold text-orange-600">¿Quieres agregarlo rápidamente?</p>
                            </div>
                        </div>
                        <Button 
                            onClick={handleQuickCreate}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 rounded-xl h-12"
                        >
                            Agregar "{error}"
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

import { cn } from '../../utils/cn';
