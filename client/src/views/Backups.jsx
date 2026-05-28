import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { motion } from 'framer-motion';
import {
    HardDrive, Download, Trash2, RotateCcw, Plus,
    AlertTriangle
} from 'lucide-react';
import { ConfirmModal } from '../components/sales/ConfirmModal';

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
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleteOpen, setDeleteOpen] = useState(false);
    const [restoreTarget, setRestoreTarget] = useState(null);
    const [isRestoreOpen, setRestoreOpen] = useState(false);
    const [isRestoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
    const toast = useToast();

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
            toast('Error al crear backup: ' + e.message, 'error');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteRequest = (id) => {
        setDeleteTarget(id);
        setDeleteOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api(`/system/backups/${deleteTarget}`, { method: 'DELETE' });
            setDeleteOpen(false);
            setDeleteTarget(null);
            await loadBackups();
        } catch (e) {
            toast('Error: ' + e.message, 'error');
        }
    };

    const handleRestoreRequest = (id) => {
        setRestoreTarget(id);
        setRestoreOpen(true);
    };

    const handleRestoreConfirm = () => {
        setRestoreOpen(false);
        setRestoreConfirmOpen(true);
    };

    const handleRestore = async () => {
        const id = restoreTarget;
        if (!id) return;
        setRestoring(id);
        setRestoreConfirmOpen(false);
        try {
            await api(`/system/backups/${id}/restore`, { method: 'POST' });
            toast('Backup restaurado correctamente', 'success');
            window.location.reload();
        } catch (e) {
            toast('Error: ' + e.message, 'error');
        } finally {
            setRestoring(null);
        }
    };

    const columns = [
        {
            key: 'filename',
            title: 'Nombre',
            sortable: true,
            render: (b) => (
                <span className="font-mono text-xs">{b.filename}</span>
            ),
        },
        {
            key: 'type',
            title: 'Tipo',
            render: (b) => (
                <Badge variant={b.type === 'manual' ? 'info' : 'success'}>
                    {b.type === 'manual' ? 'Manual' : 'Automático'}
                </Badge>
            ),
        },
        {
            key: 'size',
            title: 'Tamaño',
            sortable: true,
            render: (b) => formatBytes(b.size),
        },
        {
            key: 'created_at',
            title: 'Fecha',
            sortable: true,
            render: (b) => new Date(b.created_at).toLocaleString(),
        },
        {
            key: 'actions',
            title: 'Acciones',
            className: 'text-right',
            render: (b) => (
                <div className="flex justify-end gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600"
                        onClick={() => handleRestoreRequest(b.id)}
                        isLoading={restoring === b.id}
                        title="Restaurar"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => handleDeleteRequest(b.id)}
                        title="Eliminar"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <>
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 max-w-4xl mx-auto"
        >
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <HardDrive className="h-6 w-6 text-primary" />
                    <h1 className="text-2xl font-bold">Respaldos del Sistema</h1>
                </div>
                <Button onClick={handleCreate} isLoading={creating}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Backup
                </Button>
            </div>

            <Card className="p-4 bg-amber-50 border-amber-200 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                    <p className="font-semibold">Importante</p>
                    <p>Los backups contienen TODA la información del sistema: productos, ventas, clientes, configuración y usuarios.</p>
                </div>
            </Card>

            <Card className="p-6">
                <h3 className="font-semibold mb-4">Exportar / Importar Configuración</h3>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => window.open('/api/system/export-config', '_blank')}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar Configuración
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    Exporta solo la configuración del sistema (sin datos de ventas ni productos).
                </p>
            </Card>

            <Table
                columns={columns}
                data={backups}
                searchable={false}
                pageSize={50}
                density="comfortable"
                striped={false}
                loading={loading}
                emptyTitle="No hay backups disponibles"
                emptyDescription="Crea tu primer backup para proteger tus datos"
                emptyIcon={HardDrive}
            />
        </motion.div>

        <ConfirmModal
            open={isDeleteOpen}
            title="Eliminar Backup"
            message="¿Eliminar este backup? Esta acción no se puede deshacer."
            confirmLabel="Eliminar"
            variant="danger"
            onConfirm={handleDelete}
            onCancel={() => { setDeleteOpen(false); setDeleteTarget(null); }}
        />

        <ConfirmModal
            open={isRestoreOpen}
            title="Restaurar Backup"
            message="⚠️ Esto reemplazará TODOS los datos actuales con el backup seleccionado. ¿Continuar?"
            confirmLabel="Sí, continuar"
            variant="warning"
            onConfirm={handleRestoreConfirm}
            onCancel={() => { setRestoreOpen(false); setRestoreTarget(null); }}
        />

        <ConfirmModal
            open={isRestoreConfirmOpen}
            title="¿Está SEGURO?"
            message="Se creará un backup de seguridad automático antes de restaurar. Esta acción modificará todos los datos del sistema."
            confirmLabel="Restaurar ahora"
            variant="danger"
            onConfirm={handleRestore}
            isLoading={restoring !== null}
            onCancel={() => { setRestoreConfirmOpen(false); setRestoreTarget(null); }}
        />
        </>
    );
};

export default BackupsView;
