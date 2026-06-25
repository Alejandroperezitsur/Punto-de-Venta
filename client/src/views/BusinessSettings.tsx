import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import { useTheme } from '../context/ThemeContext';
import { Save, Check, Store, Phone, Mail, Globe, Percent, Image, Building, Receipt, Palette, Bell, Settings } from 'lucide-react';

const SettingsSection = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <Card className="mb-4">
    <div className="flex items-center gap-3 border-b border-border-subtle pb-3 mb-4">
      <div className="size-8 rounded-lg bg-bg-inset flex items-center justify-center">
        <Icon className="size-4 text-text-secondary" />
      </div>
      <h3 className="font-semibold text-base text-text-primary">{title}</h3>
    </div>
    {children}
  </Card>
);

export default function BusinessSettings() {
  const { isDark, toggleDark, setTheme, theme } = useTheme();
  const toast = useToast();
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api('/settings').then(data => setSettings(data || {})).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
    setSaved(false);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await api('/settings', { method: 'PUT', body: JSON.stringify({ ...settings, [key]: value }) });
        setSaved(true);
      } catch {}
      finally { setSaving(false); }
    }, 2000);
  };

  const handleSave = async () => {
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    setSaving(true);
    try {
      await api('/settings', { method: 'PUT', body: JSON.stringify(settings) });
      setSaved(true);
      toast('Configuracion guardada', 'success');
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) { toast('Error al guardar: ' + e.message, 'error'); }
    finally { setSaving(false); }
  };

  if (loading) {
    return <PageHeader title="Configuracion" description="Cargando..." icon={Settings} />;
  }

  return (
    <div>
      <PageHeader
        title="Configuracion del Sistema"
        description="Personaliza tu punto de venta"
        icon={Settings}
        actions={
          <Button onClick={handleSave} isLoading={saving} disabled={saved}>
            {saved ? <><Check className="size-4" /> Guardado</> : <><Save className="size-4" /> Guardar Cambios</>}
          </Button>
        }
      />

      <SettingsSection title="Informacion del Negocio" icon={Store}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Nombre</label>
            <Input value={settings.business_name || ''} onChange={e => updateSetting('business_name', e.target.value)} icon={<Building className="size-4" />} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">RFC</label>
            <Input value={settings.business_rfc || ''} onChange={e => updateSetting('business_rfc', e.target.value)} />
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Direccion</label>
            <Input value={settings.business_address || ''} onChange={e => updateSetting('business_address', e.target.value)} icon={<Globe className="size-4" />} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Telefono</label>
            <Input value={settings.business_phone || ''} onChange={e => updateSetting('business_phone', e.target.value)} icon={<Phone className="size-4" />} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Email</label>
            <Input type="email" value={settings.business_email || ''} onChange={e => updateSetting('business_email', e.target.value)} icon={<Mail className="size-4" />} />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Impuestos y Moneda" icon={Percent}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Moneda</label>
            <Select value={settings.currency || 'MXN'} onChange={v => updateSetting('currency', v)} options={[
              { value: 'MXN', label: 'MXN - Peso Mexicano' },
              { value: 'USD', label: 'USD - Dolar' },
              { value: 'EUR', label: 'EUR - Euro' },
            ]} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Nombre del Impuesto</label>
            <Input value={settings.tax_name || 'IVA'} onChange={e => updateSetting('tax_name', e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Tasa (%)</label>
            <Input type="number" step="0.01" value={((parseFloat(settings.tax_rate || 0.16)) * 100).toFixed(0)} onChange={e => updateSetting('tax_rate', (parseFloat(e.target.value) / 100).toFixed(4))} />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Tema y Apariencia" icon={Palette}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Tema</label>
            <Select value={theme} onChange={(v) => setTheme(v)} options={[
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Oscuro' },
            ]} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer self-end pb-1">
            <input type="checkbox" className="size-4 rounded" checked={settings.compact_mode === '1'} onChange={e => updateSetting('compact_mode', e.target.checked ? '1' : '0')} />
            <span className="text-sm text-text-primary">Modo Compacto (tactil)</span>
          </label>
        </div>
      </SettingsSection>

      <SettingsSection title="Personalizacion de Marca" icon={Store}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Nombre de la App</label>
            <Input value={settings.app_name || 'POS Pro'} onChange={e => updateSetting('app_name', e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Copyright Footer</label>
            <Input value={settings.app_copyright || ''} onChange={e => updateSetting('app_copyright', e.target.value)} />
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
