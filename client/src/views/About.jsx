import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import {
    Info, Shield, Check, AlertTriangle, Calendar, Cpu,
    Database, HardDrive, RefreshCw, ExternalLink
} from 'lucide-react';

const AboutView = () => {
    const [license, setLicense] = useState(null);
    const [diagnostics, setDiagnostics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showActivation, setShowActivation] = useState(false);
    const [activationKey, setActivationKey] = useState('');
    const [activationError, setActivationError] = useState(null);
    const [activating, setActivating] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [lic, diag] = await Promise.all([
                api('/system/status'),
                api('/system/diagnostics')
            ]);
            setLicense(lic);
            setDiagnostics(diag);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleActivate = async () => {
        setActivating(true);
        setActivationError(null);
        try {
            await api('/system/activate', {
                method: 'POST',
                body: JSON.stringify({ licenseKey: activationKey })
            });
            setShowActivation(false);
            setActivationKey('');
            await loadData();
        } catch (e) {
            setActivationError(e.message || 'Error al activar licencia');
        } finally {
            setActivating(false);
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getLicenseBadge = () => {
        if (!license) return null;
        const styles = {
            pro: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
            trial: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
            free: 'bg-gray-200 text-gray-700'
        };
        const labels = { pro: 'PRO', trial: 'TRIAL', free: 'FREE' };
        return (
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${styles[license.type] || styles.free}`}>
                {labels[license.type] || 'FREE'}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-[hsl(var(--muted-foreground))]">
                Cargando información...
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
                <Info className="h-6 w-6 text-[hsl(var(--primary))]" />
                <h1 className="text-2xl font-bold">Acerca de {license?.appName || 'POS Pro'}</h1>
            </div>

            {/* Hero Card */}
            <Card className="p-8 bg-gradient-to-br from-[hsl(var(--primary))] to-blue-700 text-white">
                <div className="flex items-center gap-6">
                    <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-4xl font-black">
                        P
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-3xl font-bold">{license?.appName || 'POS Pro'}</h2>
                            {getLicenseBadge()}
                        </div>
                        <p className="text-white/80">Sistema Profesional de Punto de Venta</p>
                        <p className="text-sm text-white/60 mt-2">Versión {license?.appVersion || '1.0.0'}</p>
                    </div>
                </div>
            </Card>

            {/* License Status */}
            <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Shield className="h-5 w-5 text-[hsl(var(--primary))]" />
                    <h3 className="font-semibold">Estado de Licencia</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-[hsl(var(--muted))]">
                        <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase">Tipo</p>
                        <p className="font-bold capitalize">{license?.type || 'Trial'}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[hsl(var(--muted))]">
                        <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase">Estado</p>
                        <p className={`font-bold ${license?.isValid ? 'text-green-600' : 'text-red-500'}`}>
                            {license?.isValid ? 'Activa' : 'Expirada'}
                        </p>
                    </div>
                    {license?.daysRemaining !== null && (
                        <div className="p-4 rounded-lg bg-[hsl(var(--muted))]">
                            <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase">Días Restantes</p>
                            <p className={`font-bold ${license.daysRemaining <= 7 ? 'text-amber-500' : ''}`}>
                                {license.daysRemaining}
                            </p>
                        </div>
                    )}
                    <div className="p-4 rounded-lg bg-[hsl(var(--muted))]">
                        <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase">Productos</p>
                        <p className="font-bold">
                            {license?.features?.maxProducts === -1 ? 'Ilimitados' : license?.features?.maxProducts || '50'}
                        </p>
                    </div>
                </div>
                {license?.type !== 'pro' && (
                    <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-purple-600" />
                            <span className="text-sm text-purple-700">Actualiza a PRO para desbloquear todas las funciones</span>
                        </div>
                        <Button
                            variant="outline"
                            className="border-purple-300 text-purple-700"
                            onClick={() => setShowActivation(true)}
                        >
                            Activar Licencia
                        </Button>
                    </div>
                )}
            </Card>

            {/* Activation Modal */}
            {showActivation && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md p-6 bg-white animate-in zoom-in-95">
                        <h3 className="text-lg font-bold mb-4">Activar Licencia</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Ingresa tu clave de producto. Si no tienes una, contacta al proveedor.
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium mb-1 block">Clave de Licencia</label>
                                <input
                                    type="text"
                                    placeholder="XXXX-XXXX-XXXX-XXXX"
                                    className="w-full p-2 border rounded-md font-mono text-center uppercase tracking-widest"
                                    value={activationKey}
                                    onChange={e => setActivationKey(e.target.value.toUpperCase())}
                                    maxLength={19}
                                />
                            </div>
                            {activationError && <p className="text-xs text-red-500">{activationError}</p>}
                            <div className="flex justify-end gap-2 mt-6">
                                <Button variant="ghost" onClick={() => { setShowActivation(false); setActivationError(null); }}>
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleActivate}
                                    isLoading={activating}
                                    disabled={activationKey.length < 10}
                                >
                                    Activar
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* System Info */}
            <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Cpu className="h-5 w-5 text-[hsl(var(--primary))]" />
                    <h3 className="font-semibold">Información del Sistema</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between p-3 bg-[hsl(var(--muted))] rounded-lg">
                        <span className="text-[hsl(var(--muted-foreground))]">Plataforma</span>
                        <span className="font-medium">{diagnostics?.system?.platform}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-[hsl(var(--muted))] rounded-lg">
                        <span className="text-[hsl(var(--muted-foreground))]">Arquitectura</span>
                        <span className="font-medium">{diagnostics?.system?.arch}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-[hsl(var(--muted))] rounded-lg">
                        <span className="text-[hsl(var(--muted-foreground))]">Memoria Total</span>
                        <span className="font-medium">{formatBytes(diagnostics?.system?.memory?.total || 0)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-[hsl(var(--muted))] rounded-lg">
                        <span className="text-[hsl(var(--muted-foreground))]">Base de Datos</span>
                        <span className="font-medium">{formatBytes(diagnostics?.database?.size || 0)}</span>
                    </div>
                </div>
            </Card>

            {/* Database Stats */}
            <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Database className="h-5 w-5 text-[hsl(var(--primary))]" />
                    <h3 className="font-semibold">Estadísticas de Datos</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(diagnostics?.database?.counts || {}).map(([key, value]) => (
                        <div key={key} className="text-center p-4 bg-[hsl(var(--muted))] rounded-lg">
                            <p className="text-2xl font-bold text-[hsl(var(--primary))]">{value}</p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))] capitalize">{key}</p>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Footer */}
            <div className="text-center text-sm text-[hsl(var(--muted-foreground))] pb-8">
                <p>{license?.copyright}</p>
                <p className="mt-1">Machine ID: {diagnostics?.machineId?.slice(0, 16)}...</p>
            </div>
        </div>
    );
};

export default AboutView;
