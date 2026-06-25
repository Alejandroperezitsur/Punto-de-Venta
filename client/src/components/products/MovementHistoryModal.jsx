import React, { useEffect, useState } from 'react';
import { X, ArrowDown, ArrowUp, Package } from 'lucide-react';
import { api } from '../../lib/api';
import { formatMoney } from '../../utils/format';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';

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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[var(--z-modal)] animate-fade-in">
            <Card className="w-full max-w-2xl overflow-hidden border border-border/40 flex flex-col max-h-[80vh]">
                <div className="p-5 border-b border-border/20 flex justify-between items-center bg-muted/10">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Package className="size-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-foreground">Kardex / Movimientos</h3>
                            <p className="text-xs text-muted-foreground">{product.name} ({product.sku})</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="size-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <div className="size-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                            Cargando movimientos...
                        </div>
                    ) : movements.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Package className="size-8 mx-auto mb-2 opacity-30" />
                            No hay movimientos registrados
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/30 text-muted-foreground font-medium sticky top-0">
                                <tr>
                                    <th className="px-5 py-3 text-xs uppercase tracking-wider">Fecha</th>
                                    <th className="px-5 py-3 text-xs uppercase tracking-wider">Tipo / Razon</th>
                                    <th className="px-5 py-3 text-xs uppercase tracking-wider text-right">Cambio</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/10">
                                {movements.map((m) => (
                                    <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-5 py-3 whitespace-nowrap text-muted-foreground font-mono text-xs">
                                            {new Date(m.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="font-medium text-foreground">{m.reason}</span>
                                            {m.reference_type && (
                                                <Badge size="xs" variant="neutral" className="ml-2">
                                                    {m.reference_type}
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <span className={cn(
                                                'inline-flex items-center gap-1 font-bold text-sm',
                                                m.change > 0 ? 'text-success' : 'text-danger'
                                            )}>
                                                {m.change > 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                                                {m.change > 0 ? '+' : ''}{m.change}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>
        </div>
    );
};
