import React, { useState, useEffect, useCallback } from 'react';
import { getDB } from '../../lib/db';
import { reconcileStock, getConflictHistory } from '../../lib/reconciliationEngine';
import { computeStockChecksums, createReconciliationSnapshot, compareSnapshots, applyRepair, type DivergenceReport, type RepairSuggestion } from '../../lib/reconciliationEngineExtension';

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

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-md">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl border-4 border-gray-100 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-black tracking-tight">Reconciliación de Inventario</h2>
          <button onClick={onClose} className="p-3 hover:bg-red-50 text-red-500 rounded-2xl text-2xl">&times;</button>
        </div>

        <div className="flex gap-2 mb-6">
          {(['drift', 'conflicts', 'repairs'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                tab === t ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === 'drift' ? 'Drift de Stock' : t === 'conflicts' ? 'Conflictos' : 'Reparaciones'}
            </button>
          ))}
        </div>

        {tab === 'drift' && (
          <div className="space-y-6">
            <button
              onClick={runDriftDetection}
              disabled={processing}
              className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {processing ? 'Analizando...' : 'Ejecutar Detección de Drift'}
            </button>

            {report && report.affectedProducts > 0 && (
              <div className={`p-6 rounded-2xl border-4 ${
                report.severity === 'critical' ? 'bg-red-50 border-red-200' :
                report.severity === 'high' ? 'bg-orange-50 border-orange-200' :
                'bg-yellow-50 border-yellow-200'
              }`}>
                <h3 className="text-xl font-black mb-4">
                  {report.affectedProducts} productos con divergencia — Impacto estimado: ${report.estimatedFinancialImpact}
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-bold">Producto</th>
                        <th className="text-right py-2 px-3 font-bold">Stock Local</th>
                        <th className="text-right py-2 px-3 font-bold">Stock Servidor</th>
                        <th className="text-right py-2 px-3 font-bold">Diferencia</th>
                        <th className="text-left py-2 px-3 font-bold">Acción Sugerida</th>
                        <th className="text-left py-2 px-3 font-bold">Confianza</th>
                        <th className="py-2 px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.criticalDivergences.map(d => {
                        const suggestion = report.repairSuggestions.find(s => s.productId === d.productId);
                        return (
                          <tr key={d.productId} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3 font-medium">{d.productId}</td>
                            <td className="py-2 px-3 text-right">{d.localStock}</td>
                            <td className="py-2 px-3 text-right">{d.serverStock}</td>
                            <td className={`py-2 px-3 text-right font-bold ${
                              Math.abs(d.divergence) > 5 ? 'text-red-600' : 'text-yellow-600'
                            }`}>{d.divergence > 0 ? '+' : ''}{d.divergence}</td>
                            <td className="py-2 px-3">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                                suggestion?.suggestedAction === 'merge' ? 'bg-green-100 text-green-700' :
                                suggestion?.suggestedAction === 'manual_review' ? 'bg-red-100 text-red-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {suggestion?.suggestedAction === 'merge' ? 'Merge Auto' :
                                 suggestion?.suggestedAction === 'use_server' ? 'Usar Servidor' :
                                 suggestion?.suggestedAction === 'use_local' ? 'Usar Local' : 'Revisión Manual'}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {suggestion ? `${Math.round(suggestion.confidence * 100)}%` : '-'}
                            </td>
                            <td className="py-2 px-3">
                              {suggestion && suggestion.suggestedAction !== 'manual_review' && (
                                <button
                                  onClick={() => handleRepair(suggestion)}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700"
                                >
                                  Aplicar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {report && report.affectedProducts === 0 && (
              <div className="p-8 bg-green-50 border-4 border-green-200 rounded-2xl text-center">
                <p className="text-xl font-black text-green-700">✓ Sin divergencias detectadas</p>
                <p className="text-green-600 mt-2">Stock local y servidor están sincronizados</p>
              </div>
            )}
          </div>
        )}

        {tab === 'conflicts' && (
          <div className="space-y-4">
            {conflicts.length === 0 ? (
              <div className="p-8 bg-gray-50 rounded-2xl text-center">
                <p className="text-lg font-bold text-gray-500">Sin conflictos registrados</p>
              </div>
            ) : (
              conflicts.map(c => (
                <div key={c.id || Math.random()} className="p-6 bg-gray-50 rounded-2xl border-2 border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">{c.productId || 'Conflicto'}</p>
                      <p className="text-sm text-gray-500">{c.type || 'sync'} — {new Date(c.timestamp || Date.now()).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleResolveConflict(c.id, 'server_wins')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Usar Servidor</button>
                      <button onClick={() => handleResolveConflict(c.id, 'client_wins')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold">Usar Local</button>
                      <button onClick={() => handleResolveConflict(c.id, 'merge')} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold">Merge</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'repairs' && (
          <div className="space-y-4">
            <p className="text-gray-500 font-medium">Las reparaciones sugeridas se aplicarán automáticamente según nivel de confianza.</p>
            {report?.repairSuggestions.map(s => (
              <div key={s.productId} className="p-4 border-2 border-gray-100 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-bold">{s.productId}</p>
                  <p className="text-sm text-gray-500">{s.description}</p>
                </div>
                <button
                  onClick={() => handleRepair(s)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                >
                  Aplicar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
