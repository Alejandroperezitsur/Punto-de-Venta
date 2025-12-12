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

    const handleScan = async (code) => {
        setLoading(true);
        setError('');
        try {
            const product = await api(`/products/scan/${code}`);
            if (product) {
                addItem(product);
                // Maybe play a sound here?
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
        // Manual search implementation (by name or SKU)
        // For now purely relying on scan logic for this snippet's brevity, 
        // but in a real app this would search a list.
        // Let's assume manual entry of SKU for now if "Enter" is pressed on input
        try {
            // Try scan endpoint first if it looks like a barcode
            await handleScan(query);
        } catch {
            // If not found as barcode, maybe open a search modal? 
            // For this refactor, let's keep it simple: exact match or fail, 
            // to emphasize the "cleanliness".
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
