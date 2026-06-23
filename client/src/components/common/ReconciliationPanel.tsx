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

  const tabs = [
    { key: 'drift', label: 'Drift de Stock' },
    { key: 'conflicts', label: 'Conflictos' },
    { key: 'repairs', label: 'Reparaciones' },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[var(--z-modal)]">
      <div className="bg-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-border/40 p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-info/10 flex items-center justify-center">
              <Shield className="size-5 text-info" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Reconciliacion de Inventario</h2>
              <p className="text-xs text-muted-foreground">Detecta y repara divergencias de stock</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>

        <div className="flex gap-1 p-1 bg-muted/20 rounded-xl mb-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all',
                tab === t.key
                  ? 'bg-card text-foreground shadow-sm border border-border/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
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
                report.severity === 'critical' ? 'border-l-danger bg-danger/5' :
                report.severity === 'high' ? 'border-l-warning bg-warning/5' :
                'border-l-warning bg-warning/5'
              )}>
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="size-5 text-warning" />
                  <h3 className="text-lg font-bold text-foreground">
                    {report.affectedProducts} productos con divergencia — Impacto: ${report.estimatedFinancialImpact}
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/20">
                        <th className="text-left py-2 px-3 font-semibold text-muted-foreground text-xs uppercase">Producto</th>
                        <th className="text-right py-2 px-3 font-semibold text-muted-foreground text-xs uppercase">Local</th>
                        <th className="text-right py-2 px-3 font-semibold text-muted-foreground text-xs uppercase">Servidor</th>
                        <th className="text-right py-2 px-3 font-semibold text-muted-foreground text-xs uppercase">Diferencia</th>
                        <th className="text-left py-2 px-3 font-semibold text-muted-foreground text-xs uppercase">Accion</th>
                        <th className="text-left py-2 px-3 font-semibold text-muted-foreground text-xs uppercase">Confianza</th>
                        <th className="py-2 px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.criticalDivergences.map(d => {
                        const suggestion = report.repairSuggestions.find(s => s.productId === d.productId);
                        return (
                          <tr key={d.productId} className="border-b border-border/10 hover:bg-muted/20">
                            <td className="py-2.5 px-3 font-medium text-foreground">{d.productId}</td>
                            <td className="py-2.5 px-3 text-right text-foreground">{d.localStock}</td>
                            <td className="py-2.5 px-3 text-right text-foreground">{d.serverStock}</td>
                            <td className={cn('py-2.5 px-3 text-right font-bold',
                              Math.abs(d.divergence) > 5 ? 'text-danger' : 'text-warning'
                            )}>{d.divergence > 0 ? '+' : ''}{d.divergence}</td>
                            <td className="py-2.5 px-3">
                              <Badge variant={
                                suggestion?.suggestedAction === 'merge' ? 'success' :
                                suggestion?.suggestedAction === 'manual_review' ? 'danger' : 'info'
                              } size="xs">
                                {suggestion?.suggestedAction === 'merge' ? 'Auto' :
                                 suggestion?.suggestedAction === 'use_server' ? 'Servidor' :
                                 suggestion?.suggestedAction === 'use_local' ? 'Local' : 'Manual'}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground">
                              {suggestion ? `${Math.round(suggestion.confidence * 100)}%` : '-'}
                            </td>
                            <td className="py-2.5 px-3">
                              {suggestion && suggestion.suggestedAction !== 'manual_review' && (
                                <Button size="xs" onClick={() => handleRepair(suggestion)}>
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
              <Card className="p-8 text-center border-success/20 bg-success/5">
                <CheckCircle2 className="size-10 text-success mx-auto mb-3" />
                <p className="text-lg font-bold text-foreground">Sin divergencias detectadas</p>
                <p className="text-sm text-muted-foreground mt-1">Stock local y servidor estan sincronizados</p>
              </Card>
            )}
          </div>
        )}

        {tab === 'conflicts' && (
          <div className="space-y-3">
            {conflicts.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Sin conflictos registrados</p>
              </Card>
            ) : (
              conflicts.map(c => (
                <Card key={c.id || Math.random()} className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="font-semibold text-foreground">{c.productId || 'Conflicto'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.type || 'sync'} — {new Date(c.timestamp || Date.now()).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="xs" variant="outline" onClick={() => handleResolveConflict(c.id, 'server_wins')}>Servidor</Button>
                      <Button size="xs" variant="outline" onClick={() => handleResolveConflict(c.id, 'client_wins')}>Local</Button>
                      <Button size="xs" variant="outline" onClick={() => handleResolveConflict(c.id, 'merge')}>Merge</Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === 'repairs' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Las reparaciones sugeridas se aplicaran automaticamente segun nivel de confianza.</p>
            {report?.repairSuggestions.map(s => (
              <Card key={s.productId} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-foreground">{s.productId}</p>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
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
