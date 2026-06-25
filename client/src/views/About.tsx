import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Info, Github, Shield, Zap } from 'lucide-react';

export default function AboutView() {
  return (
    <div>
      <PageHeader title="Acerca de" description="POS Pro v1.0" icon={Info} />
      <div className="max-w-lg space-y-4">
        <div className="rounded-lg bg-bg-surface border border-border-subtle p-6">
          <h2 className="font-bold text-lg text-text-primary mb-2">Sistema Profesional de Punto de Venta</h2>
          <p className="text-sm text-text-secondary mb-4">
            Disenado para negocios que requieren velocidad, confiabilidad y operacion offline-first.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-bg-inset">
              <Zap className="size-5 text-accent mx-auto mb-1" />
              <p className="text-[10px] font-bold text-text-secondary">Offline First</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-bg-inset">
              <Shield className="size-5 text-accent mx-auto mb-1" />
              <p className="text-[10px] font-bold text-text-secondary">Seguro</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-bg-inset">
              <Github className="size-5 text-accent mx-auto mb-1" />
              <p className="text-[10px] font-bold text-text-secondary">Open Source</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-text-tertiary text-center">Build 2026.1 · APV Labs</p>
      </div>
    </div>
  );
}
