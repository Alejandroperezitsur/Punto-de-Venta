import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { formatMoney } from '../utils/format';
import {
    DoorOpen, DoorClosed, ArrowDownCircle, ArrowUpCircle, RefreshCw,
    AlertCircle, Wallet, History, CheckCircle2
} from 'lucide-react';

const CashControlView = () => {
    const [session, setSession] = useState(null);
    const [summary, setSummary] = useState(null);
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openingBalance, setOpeningBalance] = useState('');
    const [actionAmount, setActionAmount] = useState('');
    const [actionRef, setActionRef] = useState('');
    const [actionType, setActionType] = useState('deposit');
    const [actionLoading, setActionLoading] = useState(false);

    // Close modal state
    const [isClosing, setIsClosing] = useState(false);
    const [closeStep, setCloseStep] = useState('input');
    const [countedCash, setCountedCash] = useState('');
    const [closeResult, setCloseResult] = useState(null);
    const [closeError, setCloseError] = useState('');
    const [closeLoading, setCloseLoading] = useState(false);

    // History modal
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
            alert('Error al abrir caja: ' + e.message);
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
        if (!amount || amount <= 0) return alert('Ingrese un monto válido');
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
            alert('Error: ' + e.message);
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
            alert('Error al cargar historial');
        } finally {
            setHistoryLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Control de Caja</h1>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={loadHistory} isLoading={historyLoading}>
                        <History className="h-4 w-4 mr-2" /> Historial
                    </Button>
                    <Button variant="ghost" onClick={loadStatus} isLoading={loading}>
                        <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
                    </Button>
                </div>
            </div>

            {loading ? (
                <Card className="p-12 text-center text-[hsl(var(--muted-foreground))]">
                    Cargando estado de caja...
                </Card>
            ) : !session ? (
                <Card className="p-8 space-y-6 border-l-4 border-l-amber-500 animate-fade-in">
                    <div className="flex items-center gap-4 text-amber-600">
                        <AlertCircle className="h-8 w-8" />
                        <div>
                            <h3 className="font-bold text-lg">Caja Cerrada</h3>
                            <p className="text-sm text-[hsl(var(--muted-foreground))]">No hay sesión de caja activa. Abre una para comenzar.</p>
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
            ) : (
                <div className="space-y-6 animate-fade-in">
                    <Card className="p-6 border-l-4 border-l-green-500 bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-900/10">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-100 text-green-600 rounded-full">
                                    <Wallet className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-green-700 dark:text-green-400">Caja Abierta</h3>
                                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                        Abierta: {new Date(session.opened_at).toLocaleString()} &bull; Inicial: {formatMoney(session.opening_balance)}
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" onClick={handleCloseStart} className="border-red-200 text-red-600 hover:bg-red-50">
                                <DoorClosed className="h-4 w-4 mr-2" /> Cerrar Caja
                            </Button>
                        </div>
                    </Card>

                    {summary && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card className="p-4 text-center">
                                <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase font-semibold">Ventas (Efectivo)</p>
                                <p className="text-xl font-bold text-green-600">{formatMoney(summary.sales)}</p>
                            </Card>
                            <Card className="p-4 text-center">
                                <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase font-semibold">Depósitos</p>
                                <p className="text-xl font-bold text-blue-600">{formatMoney(summary.deposits)}</p>
                            </Card>
                            <Card className="p-4 text-center">
                                <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase font-semibold">Retiros</p>
                                <p className="text-xl font-bold text-red-500">{formatMoney(summary.withdrawals)}</p>
                            </Card>
                            <Card className="p-4 text-center border-2 border-[hsl(var(--primary))]">
                                <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase font-semibold">Saldo Estimado</p>
                                <p className="text-xl font-black text-[hsl(var(--primary))]">{formatMoney(summary.expected)}</p>
                            </Card>
                        </div>
                    )}

                    <Card className="p-6">
                        <h4 className="font-semibold mb-4">Registrar Movimiento</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="text-xs font-medium mb-1 block">Tipo</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-[hsl(var(--border))] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                                    value={actionType}
                                    onChange={e => setActionType(e.target.value)}
                                >
                                    <option value="deposit">Depósito</option>
                                    <option value="withdraw">Retiro</option>
                                </select>
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

                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <History className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                            <h4 className="font-semibold">Movimientos de esta Sesión</h4>
                        </div>
                        {movements.length === 0 ? (
                            <p className="text-center text-[hsl(var(--muted-foreground))] py-8">Sin movimientos registrados.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                                        <tr>
                                            <th className="text-left px-4 py-2 font-medium">Tipo</th>
                                            <th className="text-left px-4 py-2 font-medium">Referencia</th>
                                            <th className="text-right px-4 py-2 font-medium">Monto</th>
                                            <th className="text-left px-4 py-2 font-medium">Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[hsl(var(--border))]">
                                        {movements.map(m => (
                                            <tr key={m.id} className="hover:bg-[hsl(var(--muted))/0.5]">
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${m.type === 'sale' ? 'bg-green-100 text-green-700' :
                                                            m.type === 'deposit' || m.type === 'opening' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-red-100 text-red-700'
                                                        }`}>
                                                        {m.type === 'sale' ? 'Venta' : m.type === 'opening' ? 'Apertura' : m.type === 'deposit' ? 'Depósito' : 'Retiro'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{m.reference || '-'}</td>
                                                <td className={`px-4 py-3 text-right font-semibold ${m.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {m.amount >= 0 ? '+' : ''}{formatMoney(m.amount)}
                                                </td>
                                                <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] font-mono text-xs">
                                                    {new Date(m.created_at).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {isClosing && (
                <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-8 animate-in slide-in-from-bottom duration-500">
                    <button
                        onClick={() => { setIsClosing(false); setCloseStep('input'); }}
                        className="absolute top-8 right-8 text-gray-400 hover:text-black font-bold"
                    >
                        CANCELAR
                    </button>

                    {closeStep === 'input' ? (
                        <div className="w-full max-w-md text-center space-y-10">
                            <h2 className="text-4xl font-black tracking-tight">¿Cuánto dinero hay en el cajón?</h2>
                            <p className="text-gray-500 font-medium italic">Cuenta tu efectivo físicamente antes de continuar.</p>

                            {closeError && (
                                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-red-700 font-bold">
                                    {closeError}
                                </div>
                            )}

                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-4xl font-black text-gray-300">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    autoFocus
                                    className="w-full h-32 bg-gray-50 border-4 border-gray-100 rounded-[2.5rem] text-6xl font-black text-center focus:outline-none focus:border-black transition-all"
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
                                className="w-full h-24 text-2xl font-black rounded-[2rem]"
                            >
                                VERIFICAR Y CERRAR CAJA
                            </Button>
                        </div>
                    ) : closeResult ? (
                        <div className="w-full max-w-md text-center space-y-8 animate-in zoom-in duration-300">
                            {Math.abs(closeResult.difference) < 0.01 ? (
                                <>
                                    <div className="h-32 w-32 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
                                        <CheckCircle2 className="h-16 w-16 stroke-[3]" />
                                    </div>
                                    <h2 className="text-5xl font-black tracking-tighter">Caja Cerrada</h2>
                                    <p className="text-xl text-gray-500 font-medium">
                                        Todo cuadra perfectamente. Diferencia: <span className="text-green-600 font-black">$0.00</span>
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="h-32 w-32 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
                                        <AlertCircle className="h-16 w-16 stroke-[3]" />
                                    </div>
                                    <h2 className="text-5xl font-black tracking-tighter">Discrepancia Detectada</h2>
                                    <p className="text-xl text-gray-500 font-medium">
                                        {closeResult.difference > 0 ? (
                                            <>Sobran <span className="text-green-600 font-black">${closeResult.difference.toFixed(2)}</span></>
                                        ) : (
                                            <>Faltan <span className="text-red-600 font-black">${Math.abs(closeResult.difference).toFixed(2)}</span></>
                                        )}
                                        <br />
                                        <span className="text-sm">Esperado: ${closeResult.expected_cash.toFixed(2)} &bull; Contado: ${closeResult.counted_cash.toFixed(2)}</span>
                                    </p>
                                </>
                            )}

                            <div className="pt-6 border-t border-gray-100">
                                <Button
                                    onClick={() => { setIsClosing(false); setCloseStep('input'); }}
                                    className="w-full h-16 text-xl font-black rounded-[1.5rem]"
                                >
                                    VOLVER AL CONTROL DE CAJA
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {showHistory && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-md">
                    <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6 rounded-[2rem]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">Historial de Cierres</h2>
                            <Button variant="ghost" onClick={() => setShowHistory(false)}>
                                Cerrar
                            </Button>
                        </div>
                        {historyData.length === 0 ? (
                            <p className="text-center text-[hsl(var(--muted-foreground))] py-8">No hay cierres registrados.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2">Fecha</th>
                                        <th className="text-left py-2">Usuario</th>
                                        <th className="text-right py-2">Esperado</th>
                                        <th className="text-right py-2">Contado</th>
                                        <th className="text-right py-2">Diferencia</th>
                                        <th className="text-center py-2">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyData.map(h => (
                                        <tr key={h.id} className="border-b hover:bg-gray-50">
                                            <td className="py-2">{new Date(h.closed_at).toLocaleDateString()}</td>
                                            <td className="py-2">{h.user}</td>
                                            <td className="py-2 text-right">${h.expected_cash.toFixed(2)}</td>
                                            <td className="py-2 text-right">${h.counted_cash.toFixed(2)}</td>
                                            <td className={`py-2 text-right font-bold ${Math.abs(h.difference) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                                                {h.difference > 0 ? '+' : ''}{h.difference.toFixed(2)}
                                            </td>
                                            <td className="py-2 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${h.status === 'closed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {h.status === 'closed' ? 'OK' : 'DISCREPANCIA'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
};

export default CashControlView;
