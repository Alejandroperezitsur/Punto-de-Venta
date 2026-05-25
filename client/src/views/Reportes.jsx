import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownRight, Sun, Coffee, DoorClosed } from 'lucide-react';
import { cn } from '../utils/cn';

const MyBusinessView = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        gain: 0,
        cash: 0,
        status: 'mejor',
        diff: 0,
        topProduct: '',
        todayTotal: 0
    });
    const [isClosing, setIsClosing] = useState(false);
    const [closingStep, setClosingStep] = useState(1);
    const [countedCash, setCountedCash] = useState('');
    const [closeLoading, setCloseLoading] = useState(false);
    const [closeResult, setCloseResult] = useState(null);
    const [closeError, setCloseError] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const now = new Date();
            const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
            const todayEnd = new Date(now.setHours(23, 59, 59, 999)).toISOString();

            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            const lwStart = new Date(lastWeek.setHours(0, 0, 0, 0)).toISOString();
            const lwEnd = new Date(lastWeek.setHours(23, 59, 59, 999)).toISOString();

            const [todaySum, lastWeekSum, sales] = await Promise.all([
                api(`/reports/summary?from=${todayStart}&to=${todayEnd}`),
                api(`/reports/summary?from=${lwStart}&to=${lwEnd}`),
                api('/sales')
            ]);

            const gain = (todaySum.total || 0) * 0.3;
            const diff = (todaySum.total || 0) - (lastWeekSum.total || 0);

            const todaySales = Array.isArray(sales.data) ? sales.data :
                Array.isArray(sales) ? sales.filter(s => s.created_at >= todayStart) : [];
            const productCounts = {};
            todaySales.forEach(s => {
                if (s.items) {
                    s.items.forEach(i => {
                        productCounts[i.product_name || i.name] = (productCounts[i.product_name || i.name] || 0) + Number(i.quantity || 0);
                    });
                }
            });
            const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Ninguno aún';

            setData({
                gain,
                cash: todaySum.total || 0,
                status: diff >= 0 ? 'mejor' : 'lento',
                diff: Math.abs(diff),
                topProduct,
                todayTotal: todaySum.total || 0
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleCloseDay = async () => {
        const counted = parseFloat(countedCash);
        if (isNaN(counted) || counted < 0) {
            setCloseError('Ingresa un monto válido');
            return;
        }
        setCloseLoading(true);
        setCloseError('');
        try {
            const result = await api('/cash/close', {
                method: 'POST',
                body: JSON.stringify({ counted_cash: counted })
            });
            setCloseResult(result);
            setClosingStep(2);
        } catch (e) {
            setCloseError(e.message || 'Error al cerrar caja');
        } finally {
            setCloseLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col justify-between p-4 md:p-8">
                <div className="text-center py-10 space-y-6">
                    <Skeleton className="h-4 w-48 mx-auto" />
                    <Skeleton className="h-24 w-72 mx-auto" />
                    <Skeleton className="h-6 w-80 mx-auto" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 py-10 border-y-2 border-border">
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-16 w-48" />
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-16 w-48" />
                    </div>
                </div>
                <div className="space-y-6 py-10">
                    <Skeleton variant="card" className="h-24" />
                    <Skeleton variant="card" className="h-24" />
                </div>
                <Skeleton className="h-24 w-full rounded-3xl" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col justify-between p-4 md:p-8 animate-in fade-in duration-500">
            <div className="text-center py-10">
                <p className="text-sm font-black text-muted-foreground uppercase tracking-[0.3em] mb-4">Lo que ganaste hoy para ti</p>
                <div className="flex items-center justify-center gap-4">
                    <span className="text-9xl font-black tracking-tighter text-foreground">
                        ${data.gain.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                </div>
                <p className="mt-6 text-xl font-medium text-muted-foreground">¡Buen trabajo! Es un día sólido.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 py-10 border-y-2 border-border">
                <div className="text-center md:text-right md:pr-12 md:border-r-2 md:border-border">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Efectivo en caja</p>
                    <p className="text-5xl font-black text-foreground">${data.cash.toLocaleString()}</p>
                </div>
                <div className="text-center md:text-left md:pl-12 flex flex-col items-center md:items-start">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Vs. el {new Date().toLocaleDateString('es-ES', { weekday: 'long' })} pasado</p>
                    <div className="flex items-center gap-3">
                        <p className="text-5xl font-black text-foreground uppercase">{data.status}</p>
                        {data.status === 'mejor' ? (
                            <ArrowUpRight className="h-10 w-10 text-success stroke-[3]" />
                        ) : (
                            <ArrowDownRight className="h-10 w-10 text-warning stroke-[3]" />
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-6 py-10">
                <Card className="flex items-center gap-4 bg-blue-50 border-blue-100">
                    <div className="h-12 w-12 bg-card rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                        <Sun className="h-6 w-6 text-blue-500" />
                    </div>
                    <p className="text-lg font-bold text-blue-900 leading-tight">
                        Tu mejor hora fue a las 2:00 PM. Mañana podrías vender más si refuerzas esa hora.
                    </p>
                </Card>

                <Card className="flex items-center gap-4 bg-orange-50 border-orange-100">
                    <div className="h-12 w-12 bg-card rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                        <Coffee className="h-6 w-6 text-orange-500" />
                    </div>
                    <p className="text-lg font-bold text-orange-900 leading-tight">
                        Tu producto estrella hoy fue <span className="underline decoration-2">{data.topProduct}</span>.
                    </p>
                </Card>
            </div>

            <div className="pt-6">
                <Button
                    onClick={() => { setIsClosing(true); setClosingStep(1); setCountedCash(''); setCloseResult(null); setCloseError(''); }}
                    size="xl"
                    className="w-full h-24 text-2xl font-black rounded-3xl bg-foreground text-background hover:brightness-110 shadow-2xl active:scale-[0.98]"
                >
                    <DoorClosed className="h-8 w-8 mr-4" />
                    CERRAR CAJA Y TERMINAR DÍA
                </Button>
            </div>

            {isClosing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
                    <div className="bg-card border border-border rounded-4xl p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-300">
                        <button
                            onClick={() => { setIsClosing(false); setClosingStep(1); }}
                            className="absolute top-8 right-8 text-muted-foreground hover:text-foreground font-bold"
                        >
                            CANCELAR
                        </button>

                        {closingStep === 1 ? (
                            <div className="w-full text-center space-y-10">
                                <h2 className="text-4xl font-black tracking-tight text-foreground">¿Cuánto dinero hay en el cajón?</h2>
                                <p className="text-muted-foreground font-medium italic">Cuenta tu efectivo físicamente ahora mismo.</p>

                                {closeError && (
                                    <div className="p-4 bg-danger/10 border-2 border-danger/20 rounded-2xl text-danger font-bold">
                                        {closeError}
                                    </div>
                                )}

                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-4xl font-black text-muted-foreground/50 z-10">$</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        autoFocus
                                        className="w-full h-32 bg-muted border-4 border-border rounded-4xl text-6xl font-black text-center focus-visible:border-foreground transition-all pl-24 pr-4"
                                        value={countedCash}
                                        onChange={(e) => setCountedCash(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleCloseDay(); }}
                                        placeholder="0"
                                    />
                                </div>

                                <Button
                                    onClick={handleCloseDay}
                                    disabled={!countedCash || closeLoading}
                                    isLoading={closeLoading}
                                    size="xl"
                                    className="w-full h-24 text-2xl font-black rounded-3xl"
                                >
                                    VERIFICAR Y CERRAR
                                </Button>
                            </div>
                        ) : closeResult ? (
                            <div className="w-full text-center space-y-8">
                                {Math.abs(closeResult.difference) < 0.01 ? (
                                    <>
                                        <div className="h-32 w-32 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
                                            <CheckCircle2 className="h-16 w-16 stroke-[3]" />
                                        </div>
                                        <h2 className="text-5xl font-black tracking-tighter text-foreground">¡Caja Cerrada!</h2>
                                        <p className="text-xl text-muted-foreground font-medium">
                                            Todo cuadra perfectamente. Puedes irte a descansar con total tranquilidad.
                                        </p>
                                        <p className="text-sm text-muted-foreground/60">
                                            Esperado: ${closeResult.expected_cash.toFixed(2)} &bull; Contado: ${closeResult.counted_cash.toFixed(2)}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="h-32 w-32 bg-warning/10 text-warning rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
                                            <AlertCircle className="h-16 w-16 stroke-[3]" />
                                        </div>
                                        <h2 className="text-5xl font-black tracking-tighter text-foreground">Discrepancia Detectada</h2>
                                        <p className="text-xl text-muted-foreground font-medium">
                                            {closeResult.difference > 0 ? (
                                                <>Sobran <span className="text-success font-black">${closeResult.difference.toFixed(2)}</span></>
                                            ) : (
                                                <>Faltan <span className="text-danger font-black">${Math.abs(closeResult.difference).toFixed(2)}</span></>
                                            )}
                                            <br />
                                            <span className="text-sm">Esperado: ${closeResult.expected_cash.toFixed(2)} &bull; Contado: ${closeResult.counted_cash.toFixed(2)}</span>
                                        </p>
                                    </>
                                )}

                                <div className="pt-10">
                                    <Button
                                        onClick={() => navigate('/caja')}
                                        size="xl"
                                        className="w-full h-20 text-xl font-black rounded-2xl bg-foreground text-background hover:brightness-110"
                                    >
                                        IR A CONTROL DE CAJA
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyBusinessView;
