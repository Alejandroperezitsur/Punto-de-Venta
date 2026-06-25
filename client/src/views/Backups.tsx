import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { HardDrive, Download, Upload, Clock } from 'lucide-react';

export default function BackupsView() {
  const { t } = useTranslation();
  const [backups] = useState([
    { id: 1, name: 'backup_2026-06-24.db', size: '2.4 MB', date: '2026-06-24 15:30' },
    { id: 2, name: 'backup_2026-06-23.db', size: '2.3 MB', date: '2026-06-23 12:00' },
  ]);
  const toast = useToast();

  return (
    <div>
      <PageHeader title={t('backups.title')} description={t('backups.description')} icon={HardDrive}
        actions={<Button size="sm"><Upload className="size-3.5" /> {t('backups.createBackup')}</Button>} />
      <div className="space-y-3">
        {backups.map(b => (
          <Card key={b.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HardDrive className="size-5 text-text-tertiary" />
                <div>
                  <p className="font-semibold text-sm text-text-primary">{b.name}</p>
                  <p className="text-xs text-text-tertiary flex items-center gap-1"><Clock className="size-3" />{b.date} · {b.size}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm"><Download className="size-3.5" /> {t('backups.download')}</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
