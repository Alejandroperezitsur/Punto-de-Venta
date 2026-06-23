import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { KpiCard } from '../components/ui/KpiCard';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { ViewContainer } from '../components/layout/ViewContainer';
import { ViewHeader } from '../components/layout/ViewHeader';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownRight, Sun, Coffee, DoorClosed, DollarSign, ShoppingCart, TrendingUp, BarChart3 } from 'lucide-react';

const ReportesView = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        gain: 0,
        cash: 0,
        status: 'mejor',
        diff: 0,
        topProduct: '',
        todayTotal: 0,
        transactionCount: 0,
        avgTicket: 0
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
            const transactionCount = todaySales.length;
            const avgTicket = transactionCount > 0 ? (todaySum.total || 0) / transactionCount : 0;

            setData({
                gain,
                cash: todaySum.total || 0,
                status: diff >= 0 ? 'mejor' : 'lento',
                diff: Math.abs(diff),
                topProduct,
                todayTotal: todaySum.total || 0,
                transactionCount,
                avgTicket
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

    const resetCloseModal = () => {
        setIsClosing(false);
        setClosingStep(1);
        setCountedCash('');
        setCloseResult(null);
        setCloseError('');
    };

    if (loading) {
        return (
            <ViewContainer maxWidth="full">
                <div className="flex flex-col justify-between gap-8">
                    <div className="text-center space-y-6">
                        <div className="h-4 w-48 mx-auto bg-muted/30 rounded animate-pulse" />
                        <div className="h-24 w-72 mx-auto bg-muted/30 rounded animate-pulse" />
                        <div className="h-6 w-80 mx-auto bg-muted/30 rounded animate-pulse" />
                    </div>
                </div>
            </ViewContainer>
        );
    }

    return (
        <ViewContainer maxWidth="full">
            <ViewHeader
                title="Reportes del Día"
                description="Resumen de ventas y rendimiento de hoy"
                icon={<BarChart3 className="size-5 text-primary" />}
            />

            {/* Hero Section */}
            <div className="text-center py-6">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Lo que ganaste hoy para ti</p>
                <div className="flex items-center justify-center gap-4">
                    <span className="text-display font-black tracking-tighter text-foreground tabular-nums">
                        ${data.gain.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                </div>
                <p className="mt-4 text-sm font-medium text-muted-foreground/65">Buen trabajo. Es un día sólido.</p>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Ventas Hoy" value={`$${data.todayTotal.toLocaleString()}`} icon={DollarSign} iconColor="success" />
                <KpiCard label="Transacciones" value={data.transactionCount} icon={ShoppingCart} iconColor="info" />
                <KpiCard label="Ticket Promedio" value={`$${data.avgTicket.toFixed(0)}`} icon={TrendingUp} iconColor="primary" />
                <KpiCard label="Efectivo en Caja" value={`$${data.cash.toLocaleString()}`} icon={BarChart3} iconColor="warning" />
            </div>

            {/* Trend Comparison */}
            <Card variant="glass" className="p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-primary/40" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="text-center md:text-right md:pr-8 md:border-r md:border-border/10">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Efectivo en caja</p>
                        <p className="text-4xl font-black text-foreground tracking-tighter tabular-nums">${data.cash.toLocaleString()}</p>
                    </div>
                    <div className="text-center md:text-left md:pl-8 flex flex-col items-center md:items-start">
                        <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em] mb-2">Vs. el {new Date().toLocaleDateString('es-ES', { weekday: 'long' })} pasado</p>
                        <div className="flex items-center gap-3">
                            <p className="text-4xl font-black text-foreground uppercase tracking-tight">{data.status}</p>
                            {data.status === 'mejor' ? (
                                <ArrowUpRight className="h-7 w-7 text-success stroke-[3]" />
                            ) : (
                                <ArrowDownRight className="h-7 w-7 text-warning stroke-[3]" />
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Insight Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card variant="glass" className="flex items-center gap-4 p-5 hover:border-primary/15 hover:shadow-md transition-all duration-200">
                    <div className="size-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                        <Sun className="size-5 text-primary" />
                    </div>
                    <p className="text-sm font-semibold leading-tight text-foreground">
                        Tu mejor hora fue a las 2:00 PM. Mañana podrías vender más si refuerzas esa hora.
                    </p>
                </Card>

                <Card variant="glass" className="flex items-center gap-4 p-5 hover:border-warning/15 hover:shadow-md transition-all duration-200">
                    <div className="size-12 bg-warning/10 rounded-xl flex items-center justify-center shrink-0">
                        <Coffee className="size-5 text-warning" />
                    </div>
                    <p className="text-sm font-semibold leading-tight text-foreground">
                        Tu producto estrella hoy fue <span className="underline decoration-2 decoration-primary/40">{data.topProduct}</span>.
                    </p>
                </Card>
            </div>

            {/* Close Day CTA */}
            <div className="pt-2">
                <Button
                    onClick={() => { setIsClosing(true); setClosingStep(1); setCountedCash(''); setCloseResult(null); setCloseError(''); }}
                    size="2xl"
                    className="w-full font-bold bg-foreground text-background hover:bg-foreground/90 shadow-lg active:scale-[0.98]"
                >
                    <DoorClosed className="h-6 w-6 mr-3" />
                    CERRAR CAJA Y TERMINAR DÍA
                </Button>
            </div>

            {/* Close Day Modal */}
            <Modal
                open={isClosing}
                onClose={resetCloseModal}
                title={closingStep === 1 ? '¿Cuánto dinero hay en el cajón?' : 'Resultado del Cierre'}
                size="sm"
            >
                {closingStep === 1 ? (
                    <div className="w-full text-center space-y-6">
                        <p className="text-sm text-muted-foreground font-medium italic">Cuenta tu efectivo físicamente ahora mismo.</p>

                        {closeError && (
                            <div className="p-3 bg-danger/10 border border-danger/15 rounded-xl text-danger text-sm font-semibold">
                                {closeError}
                            </div>
                        )}

                        <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-3xl font-bold text-muted-foreground/50 z-10">$</span>
                            <Input
                                type="number"
                                step="0.01"
                                autoFocus
                                className="w-full h-24 bg-muted/50 border border-border rounded-lg text-4xl font-bold text-center focus-visible:border-foreground transition-colors pl-16 pr-4"
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
                            className="w-full font-bold"
                        >
                            VERIFICAR Y CERRAR
                        </Button>
                    </div>
                ) : closeResult ? (
                    <div className="w-full text-center space-y-6">
                        {Math.abs(closeResult.difference) < 0.01 ? (
                            <>
                                <div className="h-20 w-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto shadow-lg">
                                    <CheckCircle2 className="h-10 w-10 stroke-[3]" />
                                </div>
                                <h2 className="text-3xl font-bold tracking-tight text-foreground">¡Caja Cerrada!</h2>
                                <p className="text-base text-muted-foreground font-medium">
                                    Todo cuadra perfectamente.
                                </p>
                                <p className="text-xs text-muted-foreground/60">
                                    Esperado: ${closeResult.expected_cash.toFixed(2)} &bull; Contado: ${closeResult.counted_cash.toFixed(2)}
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="h-20 w-20 bg-warning/10 text-warning rounded-full flex items-center justify-center mx-auto shadow-lg">
                                    <AlertCircle className="h-10 w-10 stroke-[3]" />
                                </div>
                                <h2 className="text-3xl font-bold tracking-tight text-foreground">Discrepancia Detectada</h2>
                                <p className="text-base text-muted-foreground font-medium">
                                    {closeResult.difference > 0 ? (
                                        <>Sobran <span className="text-success font-bold">${closeResult.difference.toFixed(2)}</span></>
                                    ) : (
                                        <>Faltan <span className="text-danger font-bold">${Math.abs(closeResult.difference).toFixed(2)}</span></>
                                    )}
                                    <br />
                                    <span className="text-xs">Esperado: ${closeResult.expected_cash.toFixed(2)} &bull; Contado: ${closeResult.counted_cash.toFixed(2)}</span>
                                </p>
                            </>
                        )}

                        <div className="pt-6">
                            <Button
                                onClick={() => navigate('/caja')}
                                size="xl"
                                className="w-full font-bold bg-foreground text-background hover:brightness-110"
                            >
                                IR A CONTROL DE CAJA
                            </Button>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </ViewContainer>
    );
};

export default ReportesView;
