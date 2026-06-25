import React from 'react';
import { Download as DownloadIcon, Monitor, Smartphone, Globe, CheckCircle, ExternalLink } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';

const GITHUB_REPO = 'https://github.com/Alejandroperezitsur/Punto-de-Venta';
const RELEASE_URL = `${GITHUB_REPO}/releases/latest`;

export default function DownloadView() {
  return (
    <div>
      <PageHeader title="Descargar POS Pro" description="Instala POS Pro en tu computadora o dispositivos" icon={DownloadIcon} />

      <div className="max-w-3xl space-y-6">
        {/* Desktop - Electron */}
        <div className="rounded-xl bg-bg-surface border border-border-subtle p-6">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-xl bg-action-primary/10 flex items-center justify-center shrink-0">
              <Monitor className="size-6 text-action-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-text-primary">Desktop (Windows)</h2>
              <p className="text-sm text-text-secondary mt-1">
                Aplicacion de escritorio completa con soporte offline. Instalador NSIS para Windows 10+.
              </p>
              <ul className="mt-3 space-y-1.5">
                {['Modo offline-first', 'Sin requerir servidor', 'Actualizaciones manuales', 'Instalador con asistente'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                    <CheckCircle className="size-3.5 text-success shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={RELEASE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-action-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <DownloadIcon className="size-4" />
                  Descargar para Windows
                  <ExternalLink className="size-3 opacity-60" />
                </a>
                <span className="inline-flex items-center text-xs text-text-tertiary">
                  v1.0.0 · ~73 MB · NSIS Installer
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Web - PWA */}
        <div className="rounded-xl bg-bg-surface border border-border-subtle p-6">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Globe className="size-6 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-text-primary">Web (PWA)</h2>
              <p className="text-sm text-text-secondary mt-1">
                Accede desde cualquier navegador. Instalable como aplicacion en Chrome, Edge, Safari.
              </p>
              <ul className="mt-3 space-y-1.5">
                {['Funciona en cualquier navegador', 'Instalable como PWA', 'Siempre actualizado', 'Sin instalacion requerida'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                    <CheckCircle className="size-3.5 text-success shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <a
                  href="https://alejandroperezitsur.github.io/Punto-de-Venta/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-inset border border-border-subtle text-sm font-semibold text-text-primary hover:bg-bg-surface-hover transition-colors"
                >
                  <Globe className="size-4" />
                  Abrir en navegador
                  <ExternalLink className="size-3 opacity-60" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Credenciales offline */}
        <div className="rounded-lg bg-bg-inset border border-border-subtle p-4">
          <h3 className="text-sm font-bold text-text-primary mb-2">Credenciales por defecto (modo offline)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md bg-bg-surface p-2">
              <span className="font-bold text-text-primary">Admin:</span>{' '}
              <span className="text-text-secondary">admin / admin123</span>
            </div>
            <div className="rounded-md bg-bg-surface p-2">
              <span className="font-bold text-text-primary">Cajero:</span>{' '}
              <span className="text-text-secondary">cajero / cajero123</span>
            </div>
            <div className="rounded-md bg-bg-surface p-2">
              <span className="font-bold text-text-primary">Supervisor:</span>{' '}
              <span className="text-text-secondary">supervisor / super123</span>
            </div>
          </div>
        </div>

        {/* Requisitos */}
        <div className="rounded-lg bg-bg-inset border border-border-subtle p-4">
          <h3 className="text-sm font-bold text-text-primary mb-2">Requisitos del sistema</h3>
          <div className="grid grid-cols-2 gap-4 text-xs text-text-secondary">
            <div>
              <p className="font-semibold text-text-primary mb-1">Windows</p>
              <ul className="space-y-0.5">
                <li>Windows 10 o superior</li>
                <li>4 GB RAM minimo</li>
                <li>200 MB espacio en disco</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-text-primary mb-1">Web (PWA)</p>
              <ul className="space-y-0.5">
                <li>Chrome 90+, Edge 90+, Safari 15+</li>
                <li>Conexion a internet (primera vez)</li>
                <li>Cualquier dispositivo</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
