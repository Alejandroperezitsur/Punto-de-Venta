import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { KpiCard } from '../components/ui/KpiCard';
import { ViewContainer } from '../components/layout/ViewContainer';
import { ViewHeader } from '../components/layout/ViewHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { Table } from '../components/ui/Table';
import { Select } from '../components/ui/Select';
import { motion } from 'framer-motion';
import {
    DoorOpen, DoorClosed, ArrowDownCircle, ArrowUpCircle, RefreshCw,
    AlertCircle, Wallet, History, CheckCircle2, DollarSign, TrendingUp
} from 'lucide-react';

const CashControlView = () => {
    const toast = useToast();

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount || 0);
    };

    const [session, setSession] = useState(null);
    const [summary, setSummary] = useState(null);
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openingBalance, setOpeningBalance] = useState('');
    const [actionAmount, setActionAmount] = useState('');
    const [actionRef, setActionRef] = useState('');
    const [actionType, setActionType] = useState('deposit');
    const [actionLoading, setActionLoading] = useState(false);

    const [isClosing, setIsClosing] = useState(false);
    const [closeStep, setCloseStep] = useState('input');
    const [countedCash, setCountedCash] = useState('');
    const [closeResult, setCloseResult] = useState(null);
    const [closeError, setCloseError] = useState('');
    const [closeLoading, setCloseLoading] = useState(false);

    const [showHistory, setShowHistory] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const loadStatus = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api('/cash/status');
            setSession(res.session || null);
            setSummary(res.summary || null);
            setMovements(res.movements || []);
        } catch (e) {
            console.error(e);
            setSession(null);
            setSummary(null);
            setMovements([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadStatus(); }, [loadStatus]);

    const handleOpen = async () => {
        setActionLoading(true);
        try {
            await api('/cash/open', {
                method: 'POST',
                body: JSON.stringify({ opening_balance: parseFloat(openingBalance) || 0 })
            });
            setOpeningBalance('');
            await loadStatus();
        } catch (e) {
            toast('Error al abrir caja: ' + e.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCloseStart = () => {
        setIsClosing(true);
        setCloseStep('input');
        setCountedCash('');
        setCloseResult(null);
        setCloseError('');
    };

    const handleCloseSubmit = async () => {
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
            setCloseStep('result');
            await loadStatus();
        } catch (e) {
            setCloseError(e.message);
        } finally {
            setCloseLoading(false);
        }
    };

    const handleAction = async () => {
        const amount = parseFloat(actionAmount);
        if (!amount || amount <= 0) return toast('Ingrese un monto válido', 'error');
        setActionLoading(true);
        try {
            const endpoint = actionType === 'deposit' ? '/cash/deposit' : '/cash/withdraw';
            await api(endpoint, {
                method: 'POST',
                body: JSON.stringify({ amount, reference: actionRef || (actionType === 'deposit' ? 'Depósito' : 'Retiro') })
            });
            setActionAmount('');
            setActionRef('');
            await loadStatus();
        } catch (e) {
            toast('Error: ' + e.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const loadHistory = async () => {
        setHistoryLoading(true);
        try {
            const res = await api('/cash/history');
            setHistoryData(res.data || []);
            setShowHistory(true);
        } catch (e) {
            toast('Error al cargar historial', 'error');
        } finally {
            setHistoryLoading(false);
        }
    };

    const resetCloseModal = () => {
        setIsClosing(false);
        setCloseStep('input');
        setCountedCash('');
        setCloseResult(null);
        setCloseError('');
    };

    return (
        <ViewContainer maxWidth="md">
            <ViewHeader title="Control de Caja" icon={<Wallet className="size-5 text-primary" />}>
                <Button variant="ghost" onClick={loadHistory} isLoading={historyLoading} size="sm">
                    <History className="h-4 w-4 mr-2" /> Historial
                </Button>
                <Button variant="ghost" size="icon" onClick={loadStatus} isLoading={loading} className="rounded-lg border border-border/30">
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </ViewHeader>

            {loading ? (
                <Card variant="glass" className="p-12 text-center text-muted-foreground">
                    Cargando estado de caja...
                </Card>
            ) : !session ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Card variant="glass" className="p-8 space-y-6 border-l-4 border-l-warning relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-warning to-warning/40" />
                        <div className="flex items-center gap-4">
                            <div className="p-3.5 bg-warning/10 text-warning rounded-xl">
                                <AlertCircle className="h-7 w-7" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Caja Cerrada</h3>
                                <p className="text-sm text-muted-foreground">No hay sesión de caja activa. Abre una para comenzar.</p>
                            </div>
                        </div>
                        <div className="flex items-end gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-medium mb-1 block">Saldo Inicial</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={openingBalance}
                                    onChange={e => setOpeningBalance(e.target.value)}
                                    icon={Wallet}
                                />
                            </div>
                            <Button onClick={handleOpen} isLoading={actionLoading} className="h-10">
                                <DoorOpen className="h-4 w-4 mr-2" /> Abrir Caja
                            </Button>
                        </div>
                    </Card>
                </motion.div>
            ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    {/* Status Banner */}
                    <Card variant="glass" className="p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-success to-success/40" />
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3.5 bg-success/10 text-success rounded-xl">
                                    <Wallet className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-success">Caja Abierta</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Abierta: {new Date(session.opened_at).toLocaleString()} &bull; Inicial: {formatMoney(session.opening_balance)}
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" onClick={handleCloseStart} className="border-danger/20 text-danger hover:bg-danger/5">
                                <DoorClosed className="h-4 w-4 mr-2" /> Cerrar Caja
                            </Button>
                        </div>
                    </Card>

                    {summary && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <KpiCard label="Ventas (Efectivo)" value={formatMoney(summary.sales)} icon={DollarSign} iconColor="success" />
                            <KpiCard label="Depósitos" value={formatMoney(summary.deposits)} icon={ArrowDownCircle} iconColor="info" />
                            <KpiCard label="Retiros" value={formatMoney(summary.withdrawals)} icon={ArrowUpCircle} iconColor="danger" />
                            <KpiCard label="Saldo Estimado" value={formatMoney(summary.expected)} icon={Wallet} iconColor="primary" />
                        </div>
                    )}

                    {/* Movement Form */}
                    <Card variant="glass" className="p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-primary/40" />
                        <h4 className="font-semibold mb-4 flex items-center gap-2.5">
                            <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                <ArrowDownCircle className="size-3.5 text-primary" />
                            </div>
                            Registrar Movimiento
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <Select
                                    label="Tipo"
                                    options={[{ value: 'deposit', label: 'Depósito' }, { value: 'withdraw', label: 'Retiro' }]}
                                    value={actionType}
                                    onChange={setActionType}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block">Monto</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={actionAmount}
                                    onChange={e => setActionAmount(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block">Referencia</label>
                                <Input
                                    placeholder="Ej: Pago proveedor"
                                    value={actionRef}
                                    onChange={e => setActionRef(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleAction} isLoading={actionLoading}>
                                {actionType === 'deposit' ? <ArrowDownCircle className="h-4 w-4 mr-2" /> : <ArrowUpCircle className="h-4 w-4 mr-2" />}
                                Registrar
                            </Button>
                        </div>
                    </Card>

                    {/* Movements History */}
                    <Card variant="glass" className="p-6">
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="size-7 rounded-lg bg-muted/30 flex items-center justify-center">
                                <History className="size-3.5 text-muted-foreground" />
                            </div>
                            <h4 className="font-semibold">Movimientos de esta Sesión</h4>
                            <Badge variant="glass" size="sm">{movements.length}</Badge>
                        </div>
                        <Table
                            data={movements}
                            searchable={false}
                            pageSize={movements.length || 10}
                            striped={false}
                            density="compact"
                            emptyTitle="Sin movimientos registrados."
                            columns={[
                                { key: 'type', title: 'Tipo', render: (m) => (
                                    <Badge variant={
                                        m.type === 'sale' ? 'success' :
                                        m.type === 'deposit' || m.type === 'opening' ? 'info' :
                                        'danger'
                                    } size="sm">
                                        {m.type === 'sale' ? 'Venta' : m.type === 'opening' ? 'Apertura' : m.type === 'deposit' ? 'Depósito' : 'Retiro'}
                                    </Badge>
                                )},
                                { key: 'reference', title: 'Referencia', render: (m) => <span className="text-muted-foreground">{m.reference || '-'}</span> },
                                { key: 'amount', title: 'Monto', className: 'text-right', render: (m) => (
                                    <span className={`font-semibold ${m.amount >= 0 ? 'text-success' : 'text-danger'}`}>
                                        {m.amount >= 0 ? '+' : ''}{formatMoney(m.amount)}
                                    </span>
                                )},
                                { key: 'created_at', title: 'Fecha', render: (m) => <span className="text-muted-foreground font-mono text-xs">{new Date(m.created_at).toLocaleString()}</span> },
                            ]}
                            rowKey={(m) => m.id}
                        />
                    </Card>
                </motion.div>
            )}

            {/* Close Cash Modal */}
            <Modal
                open={isClosing}
                onClose={resetCloseModal}
                title={closeStep === 'input' ? '¿Cuánto dinero hay en el cajón?' : 'Resultado del Cierre'}
                size="sm"
            >
                {closeStep === 'input' ? (
                    <div className="text-center space-y-6">
                        <p className="text-sm text-muted-foreground">Cuenta tu efectivo físicamente antes de continuar.</p>

                        {closeError && (
                            <div className="bg-danger/10 border border-danger/15 rounded-xl text-danger font-semibold p-3 text-sm">
                                {closeError}
                            </div>
                        )}

                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground/50">$</span>
                            <input
                                type="number"
                                step="0.01"
                                autoFocus
                                className="w-full h-14 bg-muted/50 border-2 border-border/30 rounded-xl text-2xl font-bold text-center focus:outline-none focus:border-primary/40 transition-all"
                                value={countedCash}
                                onChange={(e) => setCountedCash(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleCloseSubmit(); }}
                                placeholder="0"
                            />
                        </div>

                        <Button
                            onClick={handleCloseSubmit}
                            disabled={!countedCash || closeLoading}
                            isLoading={closeLoading}
                            size="lg"
                            className="w-full font-bold"
                        >
                            VERIFICAR Y CERRAR CAJA
                        </Button>
                    </div>
                ) : closeResult ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
                        {Math.abs(closeResult.difference) < 0.01 ? (
                            <>
                                <div className="size-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle2 className="size-8" />
                                </div>
                                <h2 className="text-2xl font-bold text-foreground">Caja Cerrada</h2>
                                <p className="text-sm text-muted-foreground">
                                    Todo cuadra perfectamente. Diferencia: <span className="text-success font-bold">$0.00</span>
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="size-16 bg-warning/10 text-warning rounded-full flex items-center justify-center mx-auto">
                                    <AlertCircle className="size-8" />
                                </div>
                                <h2 className="text-2xl font-bold text-foreground">Discrepancia Detectada</h2>
                                <p className="text-sm text-muted-foreground">
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

                        <div className="pt-4 border-t border-border">
                            <Button
                                onClick={resetCloseModal}
                                className="w-full"
                            >
                                VOLVER AL CONTROL DE CAJA
                            </Button>
                        </div>
                    </motion.div>
                ) : null}
            </Modal>

            {/* History Modal */}
            <Modal
                open={showHistory}
                onClose={() => setShowHistory(false)}
                title="Historial de Cierres"
                size="lg"
            >
                <Table
                    data={historyData}
                    searchable={false}
                    pageSize={historyData.length || 10}
                    striped={false}
                    density="compact"
                    emptyTitle="No hay cierres registrados."
                    columns={[
                        { key: 'closed_at', title: 'Fecha', render: (h) => new Date(h.closed_at).toLocaleDateString() },
                        { key: 'user', title: 'Usuario' },
                        { key: 'expected_cash', title: 'Esperado', className: 'text-right', render: (h) => `$${h.expected_cash.toFixed(2)}` },
                        { key: 'counted_cash', title: 'Contado', className: 'text-right', render: (h) => `$${h.counted_cash.toFixed(2)}` },
                        { key: 'difference', title: 'Diferencia', className: 'text-right font-bold', render: (h) => (
                            <span className={Math.abs(h.difference) < 0.01 ? 'text-success' : 'text-danger'}>
                                {h.difference > 0 ? '+' : ''}{h.difference.toFixed(2)}
                            </span>
                        )},
                        { key: 'status', title: 'Estado', className: 'text-center', render: (h) => (
                            <Badge variant={h.status === 'closed' ? 'success' : 'danger'} size="sm">
                                {h.status === 'closed' ? 'OK' : 'DISCREPANCIA'}
                            </Badge>
                        )},
                    ]}
                    rowKey={(h) => h.id}
                />
            </Modal>
        </ViewContainer>
    );
};

export default CashControlView;
