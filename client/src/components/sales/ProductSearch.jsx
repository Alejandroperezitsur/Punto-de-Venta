import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '../common/Input';
import { useScan } from '../../hooks/useScan';
import { api } from '../../lib/api';
import { useCartStore } from '../../store/useCartStore';

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
                // sound logic can go here
            }
        } catch (e) {
            setError('Producto no encontrado');
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

        try {
            await handleScan(code, qty);
        } catch {
            // manual search fallback
        }
        setQuery('');
    };

    return (
        <div className="w-full mb-4">
            <form onSubmit={handleSearch}>
                <Input
                    icon={Search}
                    placeholder="Escanear producto o buscar por nombre..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={loading}
                    autoFocus
                />
            </form>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
};
