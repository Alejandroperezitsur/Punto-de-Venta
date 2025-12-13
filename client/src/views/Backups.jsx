import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import {
    HardDrive, Download, Trash2, RotateCcw, Plus, Calendar,
    AlertTriangle, Check, Upload
} from 'lucide-react';

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const BackupsView = () => {
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [restoring, setRestoring] = useState(null);

    const loadBackups = async () => {
        setLoading(true);
        try {
            const data = await api('/system/backups');
            setBackups(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBackups();
    }, []);

    const handleCreate = async () => {
        setCreating(true);
        try {
            await api('/system/backups', { method: 'POST' });
            await loadBackups();
        } catch (e) {
            alert('Error al crear backup: ' + e.message);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este backup? Esta acción no se puede deshacer.')) return;
        try {
            await api(`/system/backups/${id}`, { method: 'DELETE' });
            await loadBackups();
        } catch (e) {
            alert('Error: ' + e.message);
        }
    };

    const handleRestore = async (id) => {
        if (!window.confirm('⚠️ ADVERTENCIA: Esto reemplazará TODOS los datos actuales con el backup seleccionado. ¿Continuar?')) return;
        if (!window.confirm('¿Está SEGURO? Se creará un backup de seguridad automático.')) return;

        setRestoring(id);
        try {
            await api(`/system/backups/${id}/restore`, { method: 'POST' });
            alert('✅ Backup restaurado correctamente. Por favor, recarga la aplicación.');
            window.location.reload();
        } catch (e) {
            alert('Error: ' + e.message);
        } finally {
            setRestoring(null);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <HardDrive className="h-6 w-6 text-[hsl(var(--primary))]" />
                    <h1 className="text-2xl font-bold">Respaldos del Sistema</h1>
                </div>
                <Button onClick={handleCreate} isLoading={creating}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Backup
                </Button>
            </div>

            {/* Warning */}
            <Card className="p-4 bg-amber-50 border-amber-200 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                    <p className="font-semibold">Importante</p>
                    <p>Los backups contienen TODA la información del sistema: productos, ventas, clientes, configuración y usuarios.</p>
                </div>
            </Card>

            {/* Export/Import Config */}
            <Card className="p-6">
                <h3 className="font-semibold mb-4">Exportar / Importar Configuración</h3>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => window.open('/api/system/export-config', '_blank')}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar Configuración
                    </Button>
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                    Exporta solo la configuración del sistema (sin datos de ventas ni productos).
                </p>
            </Card>

            {/* Backups List */}
            <Card className="p-0 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">Cargando backups...</div>
                ) : backups.length === 0 ? (
                    <div className="p-12 text-center">
                        <HardDrive className="h-12 w-12 mx-auto text-[hsl(var(--muted-foreground))] opacity-50 mb-4" />
                        <p className="text-[hsl(var(--muted-foreground))]">No hay backups disponibles</p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Crea tu primer backup para proteger tus datos</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-[hsl(var(--muted))]">
                            <tr>
                                <th className="text-left px-6 py-3 font-medium">Archivo</th>
                                <th className="text-left px-6 py-3 font-medium">Tipo</th>
                                <th className="text-left px-6 py-3 font-medium">Tamaño</th>
                                <th className="text-left px-6 py-3 font-medium">Fecha</th>
                                <th className="text-right px-6 py-3 font-medium">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[hsl(var(--border))]">
                            {backups.map(b => (
                                <tr key={b.id} className="hover:bg-[hsl(var(--muted))/0.5]">
                                    <td className="px-6 py-4 font-mono text-xs">{b.filename}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${b.type === 'manual' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                            }`}>
                                            {b.type === 'manual' ? 'Manual' : 'Automático'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-[hsl(var(--muted-foreground))]">
                                        {formatBytes(b.size)}
                                    </td>
                                    <td className="px-6 py-4 text-[hsl(var(--muted-foreground))]">
                                        {new Date(b.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-green-600"
                                                onClick={() => handleRestore(b.id)}
                                                isLoading={restoring === b.id}
                                                title="Restaurar"
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500"
                                                onClick={() => handleDelete(b.id)}
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>
        </div>
    );
};

export default BackupsView;
