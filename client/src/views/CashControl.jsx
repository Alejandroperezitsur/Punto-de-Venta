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
        <ViewContainer maxWidth="full">
            <ViewHeader title="Control de Caja" icon={<Wallet className="size-5 text-primary" />}>
                <Button variant="ghost" onClick={loadHistory} isLoading={historyLoading} size="sm">
                    <History className="h-4 w-4 mr-2" /> Historial
                </Button>
                <Button variant="ghost" size="icon" onClick={loadStatus} isLoading={loading} className="rounded-lg border border-border/30">
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </ViewHeader>

            {loading ? (
                <Card className="p-12 text-center text-text-secondary">
                    Cargando estado de caja...
                </Card>
            ) : !session ? (
                <div className="animate-fade-slide-in">
                    <Card className="p-8 space-y-6 border-l-4 border-l-semantic-warning">
                        <div className="flex items-center gap-4">
                            <div className="p-3.5 bg-semantic-warning-bg text-semantic-warning rounded-md">
                                <AlertCircle className="h-7 w-7" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-text-primary">Caja Cerrada</h3>
                                <p className="text-sm text-text-secondary">No hay sesion de caja activa. Abre una para comenzar.</p>
                            </div>
                        </div>
                        <div className="flex items-end gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-semibold text-muted-foreground/75 mb-1 block">Saldo Inicial</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={openingBalance}
                                    onChange={e => setOpeningBalance(e.target.value)}
                                    icon={<Wallet className="size-4" />}
                                />
                            </div>
                            <Button onClick={handleOpen} isLoading={actionLoading} className="h-10">
                                <DoorOpen className="h-4 w-4 mr-2" /> Abrir Caja
                            </Button>
                        </div>
                    </Card>
                </div>
            ) : (
                <div className="animate-fade-slide-in space-y-6">
                    {/* Status Banner */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3.5 bg-semantic-success-bg text-semantic-success rounded-md">
                                    <Wallet className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg text-semantic-success">Caja Abierta</h3>
                                    <p className="text-sm text-text-secondary">
                                        Abierta: {new Date(session.opened_at).toLocaleString()} &bull; Inicial: {formatMoney(session.opening_balance)}
                                    </p>
                                </div>
                            </div>
                            <Button variant="danger" onClick={handleCloseStart}>
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
                    <Card className="p-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2.5 text-text-primary">
                            <div className="size-7 rounded-md bg-bg-inset flex items-center justify-center">
                                <ArrowDownCircle className="size-3.5 text-text-secondary" />
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
                                <label className="text-xs font-semibold text-muted-foreground/75 mb-1 block">Monto</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={actionAmount}
                                    onChange={e => setActionAmount(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground/75 mb-1 block">Referencia</label>
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
                    <Card className="p-6">
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="size-7 rounded-md bg-bg-inset flex items-center justify-center">
                                <History className="size-3.5 text-text-secondary" />
                            </div>
                            <h4 className="font-semibold text-text-primary">Movimientos de esta Sesion</h4>
                            <Badge variant="counter" size="sm">{movements.length}</Badge>
                        </div>
                        <Table
                            data={movements}
                            searchable={false}
                            pageSize={movements.length || 10}
                            density="compact"
                            emptyMessage="Sin movimientos registrados."
                            columns={[
                                { key: 'type', label: 'Tipo', render: (m) => (
                                    <Badge variant="alert" color={
                                        m.type === 'sale' ? 'success' :
                                        m.type === 'deposit' || m.type === 'opening' ? 'info' :
                                        'danger'
                                    } size="sm">
                                        {m.type === 'sale' ? 'Venta' : m.type === 'opening' ? 'Apertura' : m.type === 'deposit' ? 'Deposito' : 'Retiro'}
                                    </Badge>
                                )},
                                { key: 'reference', label: 'Referencia', render: (m) => <span className="text-text-secondary">{m.reference || '-'}</span> },
                                { key: 'amount', label: 'Monto', className: 'text-right', render: (m) => (
                                    <span className={`font-semibold ${m.amount >= 0 ? 'text-semantic-success' : 'text-semantic-danger'}`}>
                                        {m.amount >= 0 ? '+' : ''}{formatMoney(m.amount)}
                                    </span>
                                )},
                                { key: 'created_at', label: 'Fecha', render: (m) => <span className="text-text-secondary font-mono text-xs">{new Date(m.created_at).toLocaleString()}</span> },
                            ]}
                            keyExtractor={(m) => m.id}
                        />
                    </Card>
                </div>
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
                            <div className="bg-semantic-danger-bg border border-semantic-danger/20 rounded-md text-semantic-danger font-semibold p-3 text-sm">
                                {closeError}
                            </div>
                        )}

                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-text-tertiary">$</span>
                            <input
                                type="number"
                                step="0.01"
                                autoFocus
                                className="w-full h-14 bg-bg-inset border border-border-default rounded-md text-2xl font-bold text-center focus:outline-none focus:border-border-strong transition-colors"
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
                    <div className="animate-fade-slide-in text-center space-y-6">
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
                    </div>
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
                    density="compact"
                    emptyMessage="No hay cierres registrados."
                    columns={[
                        { key: 'closed_at', label: 'Fecha', render: (h) => new Date(h.closed_at).toLocaleDateString() },
                        { key: 'user', label: 'Usuario' },
                        { key: 'expected_cash', label: 'Esperado', className: 'text-right', render: (h) => `$${h.expected_cash.toFixed(2)}` },
                        { key: 'counted_cash', label: 'Contado', className: 'text-right', render: (h) => `$${h.counted_cash.toFixed(2)}` },
                        { key: 'difference', label: 'Diferencia', className: 'text-right font-bold', render: (h) => (
                            <span className={Math.abs(h.difference) < 0.01 ? 'text-success' : 'text-danger'}>
                                {h.difference > 0 ? '+' : ''}{h.difference.toFixed(2)}
                            </span>
                        )},
                        { key: 'status', label: 'Estado', className: 'text-center', render: (h) => (
                            <Badge variant={h.status === 'closed' ? 'success' : 'danger'} size="sm">
                                {h.status === 'closed' ? 'OK' : 'DISCREPANCIA'}
                            </Badge>
                        )},
                    ]}
                    keyExtractor={(h) => h.id}
                />
            </Modal>
        </ViewContainer>
    );
};

export default CashControlView;
