import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import { Palette, Save } from 'lucide-react';

export default function BrandingView() {
  const { t } = useTranslation();
  const toast = useToast();
  const saved = JSON.parse(localStorage.getItem('app_branding') || '{}');
  const [branding, setBranding] = useState({ businessName: saved.businessName || 'POS Pro', logo: saved.logo || null as string | null });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setBranding({ ...branding, logo: reader.result as string }); };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    localStorage.setItem('app_branding', JSON.stringify(branding));
    window.dispatchEvent(new CustomEvent('branding-updated'));
    toast(t('branding.saved'), 'success');
  };

  return (
    <div>
      <PageHeader title={t('branding.title')} description={t('branding.description')} icon={Palette}
        actions={<Button onClick={handleSave} size="sm"><Save className="size-3.5" /> {t('common.save')}</Button>} />
      <div className="max-w-md space-y-6">
        <div className="rounded-xl bg-bg-surface border border-border-subtle p-6 space-y-4">
          <div className="space-y-1"><label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">{t('branding.businessName')}</label>
            <Input value={branding.businessName} onChange={e => setBranding({ ...branding, businessName: e.target.value })} /></div>
          <div className="space-y-1"><label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">{t('branding.logo')}</label>
            <div className="flex items-center gap-3">
              {branding.logo && <img src={branding.logo} alt="Logo" className="size-12 rounded-lg object-contain bg-bg-inset border border-border-subtle" />}
              <label className="px-4 py-2 rounded-md bg-bg-inset border border-border-subtle text-sm font-medium text-text-secondary hover:bg-bg-surface-hover cursor-pointer transition-colors">{t('branding.uploadLogo')}
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" /></label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
