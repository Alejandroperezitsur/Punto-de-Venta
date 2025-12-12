import React, { useEffect, useState } from 'react';
import { X, ArrowDown, ArrowUp, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import { formatMoney } from '../../utils/format';

export const MovementHistoryModal = ({ product, onClose }) => {
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await api(`/products/${product.id}/movements`);
                setMovements(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [product]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-[hsl(var(--border))] flex flex-col max-h-[80vh]">
                <div className="p-5 border-b border-[hsl(var(--border))] flex justify-between items-center bg-[hsl(var(--bg-muted))/0.5]">
                    <div>
                        <h3 className="font-bold text-xl">Kardex / Movimientos</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">{product.name} ({product.sku})</p>
                    </div>
                    <button onClick={onClose} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] p-2 rounded-full hover:bg-[hsl(var(--bg-muted))] transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-0">
                    {loading ? (
                        <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">Cargando movimientos...</div>
                    ) : movements.length === 0 ? (
                        <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">No hay movimientos registrados</div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[hsl(var(--bg-muted))] text-[hsl(var(--muted-foreground))] font-medium sticky top-0">
                                <tr>
                                    <th className="px-6 py-3">Fecha</th>
                                    <th className="px-6 py-3">Tipo / Razón</th>
                                    <th className="px-6 py-3 text-right">Cambio</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[hsl(var(--border))]">
                                {movements.map((m) => (
                                    <tr key={m.id} className="hover:bg-[hsl(var(--bg-muted))/0.5]">
                                        <td className="px-6 py-4 whitespace-nowrap text-[hsl(var(--muted-foreground))] font-mono text-xs">
                                            {new Date(m.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-[hsl(var(--foreground))]">{m.reason}</span>
                                            {m.reference_type && (
                                                <span className="ml-2 text-xs bg-[hsl(var(--secondary))] px-1.5 py-0.5 rounded text-[hsl(var(--muted-foreground))]">
                                                    {m.reference_type}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-flex items-center gap-1 font-bold ${m.change > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {m.change > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                                {m.change > 0 ? '+' : ''}{m.change}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};
