import React from 'react';
import { Download as DownloadIcon, Monitor, Globe, CheckCircle, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/ui/PageHeader';

const GITHUB_REPO = 'https://github.com/Alejandroperezitsur/Punto-de-Venta';
const DOWNLOAD_URL = `${GITHUB_REPO}/releases/download/v1.0.0/POS.Pro.Setup.1.0.0.exe`;

export default function DownloadView() {
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader title={t('download.title')} description={t('download.description')} icon={DownloadIcon} />

      <div className="max-w-3xl space-y-6">
        {/* Desktop - Electron */}
        <div className="rounded-xl bg-bg-surface border border-border-subtle p-6">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-xl bg-action-primary/10 flex items-center justify-center shrink-0">
              <Monitor className="size-6 text-action-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-text-primary">{t('download.desktop')}</h2>
              <p className="text-sm text-text-secondary mt-1">
                {t('download.desktopDesc')}
              </p>
              <ul className="mt-3 space-y-1.5">
                {[t('download.offlineFirst'), t('download.noServer'), t('download.manualUpdates'), t('download.installerWizard')].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                    <CheckCircle className="size-3.5 text-success shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={DOWNLOAD_URL}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-action-primary text-[var(--action-primary-text)] text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <DownloadIcon className="size-4" />
                  {t('download.downloadWindows')}
                </a>
                <span className="inline-flex items-center text-xs text-text-tertiary">
                  {t('download.versionInfo')}
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
              <h2 className="text-lg font-bold text-text-primary">{t('download.web')}</h2>
              <p className="text-sm text-text-secondary mt-1">
                {t('download.webDesc')}
              </p>
              <ul className="mt-3 space-y-1.5">
                {[t('download.anyBrowser'), t('download.installablePWA'), t('download.alwaysUpdated'), t('download.noInstallRequired')].map(f => (
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
                  {t('download.openBrowser')}
                  <ExternalLink className="size-3 opacity-60" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Credenciales offline */}
        <div className="rounded-lg bg-bg-inset border border-border-subtle p-4">
          <h3 className="text-sm font-bold text-text-primary mb-2">{t('download.defaultCredentials')}</h3>
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
          <h3 className="text-sm font-bold text-text-primary mb-2">{t('download.systemRequirements')}</h3>
          <div className="grid grid-cols-2 gap-4 text-xs text-text-secondary">
            <div>
              <p className="font-semibold text-text-primary mb-1">Windows</p>
              <ul className="space-y-0.5">
                <li>{t('download.winRequirements')}</li>
                <li>{t('download.winRam')}</li>
                <li>{t('download.winDisk')}</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-text-primary mb-1">Web (PWA)</p>
              <ul className="space-y-0.5">
                <li>{t('download.webRequirements')}</li>
                <li>{t('download.webConnection')}</li>
                <li>{t('download.webDevice')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
