import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { formatMoney } from '../utils/format';
import {
    DoorOpen, DoorClosed, ArrowDownCircle, ArrowUpCircle, RefreshCw,
    AlertCircle, Wallet, History
} from 'lucide-react';

const CashControlView = () => {
    const [session, setSession] = useState(null);
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openingBalance, setOpeningBalance] = useState('');
    const [actionAmount, setActionAmount] = useState('');
    const [actionRef, setActionRef] = useState('');
    const [actionType, setActionType] = useState('deposit'); // or 'withdraw'
    const [actionLoading, setActionLoading] = useState(false);

    const loadStatus = useCallback(async () => {
        setLoading(true);
        try {
            const { session: s } = await api('/cash/status');
            setSession(s || null);
            if (s) {
                const mvs = await api('/cash/movements');
                setMovements(mvs);
            } else {
                setMovements([]);
            }
        } catch (e) {
            console.error(e);
            setSession(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStatus();
    }, [loadStatus]);

    const handleOpen = async () => {
        setActionLoading(true);
        try {
            await api('/cash/open', { method: 'POST', body: JSON.stringify({ opening_balance: parseFloat(openingBalance) || 0 }) });
            setOpeningBalance('');
            await loadStatus();
            window.dispatchEvent(new CustomEvent('cash-status', { detail: { open: true } }));
        } catch (e) {
            alert('Error al abrir caja: ' + e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleClose = async () => {
        if (!window.confirm('¿Cerrar la caja actual?')) return;
        setActionLoading(true);
        try {
            await api('/cash/close', { method: 'POST' });
            await loadStatus();
            window.dispatchEvent(new CustomEvent('cash-status', { detail: { open: false } }));
        } catch (e) {
            alert('Error al cerrar caja: ' + e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleAction = async () => {
        const amount = parseFloat(actionAmount);
        if (!amount || amount <= 0) return alert('Ingrese un monto válido');
        setActionLoading(true);
        try {
            const endpoint = actionType === 'deposit' ? '/cash/deposit' : '/cash/withdraw';
            await api(endpoint, { method: 'POST', body: JSON.stringify({ amount, reference: actionRef || (actionType === 'deposit' ? 'Depósito' : 'Retiro') }) });
            setActionAmount('');
            setActionRef('');
            await loadStatus();
        } catch (e) {
            alert('Error: ' + e.message);
        } finally {
            setActionLoading(false);
        }
    };

    // Calculate totals
    const sales = movements.filter(m => m.type === 'sale').reduce((s, m) => s + (m.amount || 0), 0);
    const deposits = movements.filter(m => m.type === 'deposit').reduce((s, m) => s + (m.amount || 0), 0);
    const withdrawals = movements.filter(m => m.type === 'withdraw').reduce((s, m) => s + Math.abs(m.amount || 0), 0);
    const estimated = session ? (session.opening_balance || 0) + sales + deposits - withdrawals : 0;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Control de Caja</h1>
                <Button variant="ghost" onClick={loadStatus} isLoading={loading}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
                </Button>
            </div>

            {loading ? (
                <Card className="p-12 text-center text-[hsl(var(--muted-foreground))]">
                    Cargando estado de caja...
                </Card>
            ) : !session ? (
                /* No Session - Show Open Form */
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
                /* Active Session */
                <div className="space-y-6 animate-fade-in">
                    {/* Session Info Card */}
                    <Card className="p-6 border-l-4 border-l-green-500 bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-900/10">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-100 text-green-600 rounded-full">
                                    <Wallet className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-green-700 dark:text-green-400">Caja Abierta</h3>
                                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                        Abierta: {new Date(session.opened_at).toLocaleString()} • Inicial: {formatMoney(session.opening_balance)}
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" onClick={handleClose} isLoading={actionLoading} className="border-red-200 text-red-600 hover:bg-red-50">
                                <DoorClosed className="h-4 w-4 mr-2" /> Cerrar Caja
                            </Button>
                        </div>
                    </Card>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="p-4 text-center">
                            <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase font-semibold">Ventas (Efectivo)</p>
                            <p className="text-xl font-bold text-green-600">{formatMoney(sales)}</p>
                        </Card>
                        <Card className="p-4 text-center">
                            <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase font-semibold">Depósitos</p>
                            <p className="text-xl font-bold text-blue-600">{formatMoney(deposits)}</p>
                        </Card>
                        <Card className="p-4 text-center">
                            <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase font-semibold">Retiros</p>
                            <p className="text-xl font-bold text-red-500">{formatMoney(withdrawals)}</p>
                        </Card>
                        <Card className="p-4 text-center border-2 border-[hsl(var(--primary))]">
                            <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase font-semibold">Saldo Estimado</p>
                            <p className="text-xl font-black text-[hsl(var(--primary))]">{formatMoney(estimated)}</p>
                        </Card>
                    </div>

                    {/* Actions */}
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
                                    placeholder="0.00"
                                    value={actionAmount}
                                    onChange={e => setActionAmount(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block">Referencia (Opcional)</label>
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

                    {/* Movements Table */}
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
                                                            m.type === 'deposit' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-red-100 text-red-700'
                                                        }`}>
                                                        {m.type === 'sale' ? 'Venta' : m.type === 'deposit' ? 'Depósito' : 'Retiro'}
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
        </div>
    );
};

export default CashControlView;
