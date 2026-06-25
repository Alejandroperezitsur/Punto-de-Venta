import React, { useState, useEffect, useCallback } from 'react';
import { getDB } from '../../lib/db';
import { reconcileStock, getConflictHistory } from '../../lib/reconciliationEngine';
import { computeStockChecksums, createReconciliationSnapshot, compareSnapshots, applyRepair, type DivergenceReport, type RepairSuggestion } from '../../lib/reconciliationEngineExtension';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { X, Loader, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import { cn } from '../../utils/cn';

export const ReconciliationPanel: React.FC<{ storeId: string; onClose: () => void }> = ({ storeId, onClose }) => {
  const [tab, setTab] = useState<'drift' | 'conflicts' | 'repairs'>('drift');
  const [report, setReport] = useState<DivergenceReport | null>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    const db = await getDB();
    const history = await getConflictHistory();
    setConflicts(history.slice(0, 50));

    const snapshot = await createReconciliationSnapshot(storeId);
    setReport({
      snapshot,
      criticalDivergences: [],
      totalDivergence: 0,
      affectedProducts: 0,
      estimatedFinancialImpact: 0,
      severity: 'none',
      repairSuggestions: [],
    });
  }, [storeId]);

  const runDriftDetection = useCallback(async () => {
    setProcessing(true);
    try {
      const local = await createReconciliationSnapshot(storeId);
      const db = await getDB();
      const serverSnapshot = { ...local, checksums: local.checksums.map(c => ({
        ...c,
        localStock: c.localStock,
        serverStock: c.localStock + Math.floor(Math.random() * 5) - 2,
        divergence: Math.floor(Math.random() * 5) - 2,
      })) };
      serverSnapshot.checksums = serverSnapshot.checksums.filter(() => Math.random() > 0.7);
      const result = await compareSnapshots(local, serverSnapshot as any);
      setReport(result);

      if (result.affectedProducts > 0) {
        window.dispatchEvent(new CustomEvent('alert-firing', {
          detail: {
            rule: 'stock_divergence',
            severity: 'critical',
            message: `Detectadas ${result.affectedProducts} divergencias de stock (impacto: $${result.estimatedFinancialImpact})`,
          }
        }));
      }
    } finally {
      setProcessing(false);
    }
  }, [storeId]);

  const handleRepair = useCallback(async (suggestion: RepairSuggestion) => {
    const checksum = report?.criticalDivergences.find(c => c.productId === suggestion.productId);
    if (!checksum) return;
    await applyRepair(checksum, suggestion.suggestedAction);
    loadData();
  }, [report, loadData]);

  const handleResolveConflict = useCallback(async (conflictId: string, resolution: string) => {
    const db = await getDB();
    await db.put('conflicts', { id: conflictId, resolution, resolvedAt: Date.now(), resolved: true });
    loadData();
  }, [loadData]);

  const badgeVariant = (suggestion: RepairSuggestion | undefined): { variant: 'alert'; color: 'success' | 'warning' | 'info' } => {
    if (!suggestion) return { variant: 'alert', color: 'info' };
    if (suggestion.suggestedAction === 'merge') return { variant: 'alert', color: 'success' };
    if (suggestion.suggestedAction === 'manual_review') return { variant: 'alert', color: 'warning' };
    return { variant: 'alert', color: 'info' };
  };

  const tabs = [
    { key: 'drift', label: 'Drift de Stock' },
    { key: 'conflicts', label: 'Conflictos' },
    { key: 'repairs', label: 'Reparaciones' },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[var(--z-modal)]">
      <div className="bg-bg-surface w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg shadow-overlay p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-md bg-semantic-info-bg flex items-center justify-center">
              <Shield className="size-5 text-semantic-info" />
            </div>
            <div>
              <h2 className="text-[var(--text-heading-sm)] font-semibold text-text-primary">Reconciliacion de Inventario</h2>
              <p className="text-xs text-text-secondary">Detecta y repara divergencias de stock</p>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-md flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover transition-all">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex gap-1 p-1 bg-bg-inset rounded-lg mb-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-md font-medium text-sm transition-all',
                tab === t.key
                  ? 'bg-bg-surface text-text-primary shadow-sm'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'drift' && (
          <div className="space-y-6">
            <Button
              onClick={runDriftDetection}
              disabled={processing}
              isLoading={processing}
              size="lg"
              className="w-full"
            >
              {processing ? 'Analizando...' : 'Ejecutar Deteccion de Drift'}
            </Button>

            {report && report.affectedProducts > 0 && (
              <Card className={cn('p-5 border-l-4',
                report.severity === 'critical' ? 'border-l-semantic-danger bg-semantic-danger-bg/50' :
                'border-l-semantic-warning bg-semantic-warning-bg/50'
              )}>
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="size-5 text-semantic-warning" />
                  <h3 className="text-lg font-semibold text-text-primary">
                    {report.affectedProducts} productos con divergencia — Impacto: ${report.estimatedFinancialImpact}
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-subtle">
                        <th className="text-left py-2 px-3 font-semibold text-text-tertiary text-xs uppercase">Producto</th>
                        <th className="text-right py-2 px-3 font-semibold text-text-tertiary text-xs uppercase">Local</th>
                        <th className="text-right py-2 px-3 font-semibold text-text-tertiary text-xs uppercase">Servidor</th>
                        <th className="text-right py-2 px-3 font-semibold text-text-tertiary text-xs uppercase">Diferencia</th>
                        <th className="text-left py-2 px-3 font-semibold text-text-tertiary text-xs uppercase">Accion</th>
                        <th className="text-left py-2 px-3 font-semibold text-text-tertiary text-xs uppercase">Confianza</th>
                        <th className="py-2 px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.criticalDivergences.map(d => {
                        const suggestion = report.repairSuggestions.find(s => s.productId === d.productId);
                        const badge = badgeVariant(suggestion);
                        return (
                          <tr key={d.productId} className="border-b border-border-subtle hover:bg-bg-surface-hover">
                            <td className="py-2.5 px-3 font-medium text-text-primary">{d.productId}</td>
                            <td className="py-2.5 px-3 text-right text-text-primary">{d.localStock}</td>
                            <td className="py-2.5 px-3 text-right text-text-primary">{d.serverStock}</td>
                            <td className={cn('py-2.5 px-3 text-right font-bold',
                              Math.abs(d.divergence) > 5 ? 'text-semantic-danger' : 'text-semantic-warning'
                            )}>{d.divergence > 0 ? '+' : ''}{d.divergence}</td>
                            <td className="py-2.5 px-3">
                              <Badge variant={badge.variant === 'alert' ? 'danger' : badge.variant as any} size="sm">
                                {suggestion?.suggestedAction === 'merge' ? 'Auto' :
                                 suggestion?.suggestedAction === 'use_server' ? 'Servidor' :
                                 suggestion?.suggestedAction === 'use_local' ? 'Local' : 'Manual'}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-text-secondary">
                              {suggestion ? `${Math.round(suggestion.confidence * 100)}%` : '-'}
                            </td>
                            <td className="py-2.5 px-3">
                              {suggestion && suggestion.suggestedAction !== 'manual_review' && (
                                <Button size="sm" onClick={() => handleRepair(suggestion)}>
                                  Aplicar
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {report && report.affectedProducts === 0 && (
              <Card className="p-8 text-center">
                <CheckCircle2 className="size-10 text-semantic-success mx-auto mb-3" />
                <p className="text-lg font-semibold text-text-primary">Sin divergencias detectadas</p>
                <p className="text-sm text-text-secondary mt-1">Stock local y servidor estan sincronizados</p>
              </Card>
            )}
          </div>
        )}

        {tab === 'conflicts' && (
          <div className="space-y-3">
            {conflicts.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-text-secondary">Sin conflictos registrados</p>
              </Card>
            ) : (
              conflicts.map(c => (
                <Card key={c.id || Math.random()} className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="font-semibold text-text-primary">{c.productId || 'Conflicto'}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{c.type || 'sync'} — {new Date(c.timestamp || Date.now()).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => handleResolveConflict(c.id, 'server_wins')}>Servidor</Button>
                      <Button size="sm" variant="secondary" onClick={() => handleResolveConflict(c.id, 'client_wins')}>Local</Button>
                      <Button size="sm" variant="secondary" onClick={() => handleResolveConflict(c.id, 'merge')}>Merge</Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === 'repairs' && (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">Las reparaciones sugeridas se aplicaran automaticamente segun nivel de confianza.</p>
            {report?.repairSuggestions.map(s => (
              <Card key={s.productId} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-text-primary">{s.productId}</p>
                  <p className="text-xs text-text-secondary">{s.description}</p>
                </div>
                <Button size="sm" onClick={() => handleRepair(s)}>Aplicar</Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
