import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { Select } from '../components/ui/Select';
import { useToast } from '../components/ui/Toast';
import { useTheme } from '../context/ThemeContext';
import {
  Settings, Store, Receipt, Palette, Bell, Save, Check,
  Building, Phone, Mail, Globe, Percent, Image
} from 'lucide-react';

const SettingsSection = ({ title, icon: Icon, children }) => (
  <Card variant="outline" className="p-6 space-y-4 rounded-2xl border-border/12 hover:border-border/20 transition-colors">
    <div className="flex items-center gap-3 border-b border-border/8 pb-3 mb-2">
      <div className="size-8 rounded-lg bg-primary/6 flex items-center justify-center">
        <Icon className="size-4 text-primary/70" />
      </div>
      <h3 className="font-semibold text-base text-foreground">{title}</h3>
    </div>
    {children}
  </Card>
);

const BusinessSettings = () => {
  const { isDark, toggleDark, setTheme, themes, theme } = useTheme();
  const toast = useToast();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api('/settings');
      setSettings(data || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      setSaved(true);
      toast('Configuración guardada correctamente', 'success');
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      toast('Error al guardar: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateSetting('business_logo', String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-20">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        {[1, 2, 3].map(i => (
          <Card key={i} variant="outline" className="p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-3 mb-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-48" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20 animate-fade-slide-in">
      <div className="flex justify-between items-center pb-5 border-b border-border/8">
        <div className="flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-primary/6 border border-primary/8 flex items-center justify-center shadow-xs shadow-primary/5">
            <Settings className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-[1.5rem] font-bold tracking-tight text-foreground leading-tight">Configuración del Sistema</h1>
            <p className="text-muted-foreground font-medium text-xs mt-0.5">Personaliza tu punto de venta</p>
          </div>
        </div>
        <Button onClick={handleSave} isLoading={saving} disabled={saved}>
          {saved ? (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center"
            >
              <Check className="h-4 w-4 mr-2" />
              Guardado
            </motion.span>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>

      {/* Business Info */}
      <SettingsSection title="Información del Negocio" icon={Store}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium mb-1 block">Nombre del Negocio</label>
            <Input
              placeholder="Mi Tienda"
              value={settings.business_name || ''}
              onChange={e => updateSetting('business_name', e.target.value)}
              icon={Building}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">RFC</label>
            <Input
              placeholder="XAXX010101000"
              value={settings.business_rfc || ''}
              onChange={e => updateSetting('business_rfc', e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium mb-1 block">Dirección</label>
            <Input
              placeholder="Calle, Número, Colonia, CP, Ciudad"
              value={settings.business_address || ''}
              onChange={e => updateSetting('business_address', e.target.value)}
              icon={Globe}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Teléfono</label>
            <Input
              placeholder="+52 55 1234 5678"
              value={settings.business_phone || ''}
              onChange={e => updateSetting('business_phone', e.target.value)}
              icon={Phone}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Email</label>
            <Input
              type="email"
              placeholder="contacto@mitienda.com"
              value={settings.business_email || ''}
              onChange={e => updateSetting('business_email', e.target.value)}
              icon={Mail}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium mb-1 block">Logo del Negocio</label>
            <div className="flex items-center gap-4">
              {settings.business_logo ? (
                <img src={settings.business_logo} alt="Logo" className="h-16 w-16 object-contain rounded-lg border border-border" />
              ) : (
                <div className="h-16 w-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                  <Image className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
                <label htmlFor="logo-upload">
                  <Button as="span" variant="outline" className="cursor-pointer">
                    Subir Logo
                  </Button>
                </label>
                {settings.business_logo && (
                  <Button variant="ghost" className="ml-2 text-red-500" onClick={() => updateSetting('business_logo', '')}>
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Tax & Currency */}
      <SettingsSection title="Impuestos y Moneda" icon={Percent}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Select
                options={[
                    { value: 'MXN', label: 'MXN - Peso Mexicano' },
                    { value: 'USD', label: 'USD - Dólar' },
                    { value: 'EUR', label: 'EUR - Euro' },
                    { value: 'COP', label: 'COP - Peso Colombiano' },
                    { value: 'ARS', label: 'ARS - Peso Argentino' },
                ]}
                value={settings.currency || 'MXN'}
                onChange={(v) => updateSetting('currency', v)}
                label="Moneda"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Nombre del Impuesto</label>
            <Input
              placeholder="IVA"
              value={settings.tax_name || 'IVA'}
              onChange={e => updateSetting('tax_name', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Tasa de Impuesto (%)</label>
            <Input
              type="number"
              step="0.01"
              placeholder="16"
              value={(parseFloat(settings.tax_rate || 0.16) * 100).toFixed(0)}
              onChange={e => updateSetting('tax_rate', (parseFloat(e.target.value) / 100).toFixed(4))}
            />
          </div>
          <div className="md:col-span-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={settings.tax_included === '1'}
                onChange={e => updateSetting('tax_included', e.target.checked ? '1' : '0')}
              />
              <span className="text-sm">Los precios ya incluyen impuestos</span>
            </label>
          </div>
        </div>
      </SettingsSection>

      {/* Ticket Settings */}
      <SettingsSection title="Configuración de Tickets" icon={Receipt}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
                options={[
                    { value: '58', label: '58mm (Pequeño)' },
                    { value: '80', label: '80mm (Estándar)' },
                ]}
                value={settings.ticket_width || '80'}
                onChange={(v) => updateSetting('ticket_width', v)}
                label="Ancho del Ticket (mm)"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Mensaje de Pie</label>
            <Input
              placeholder="¡Gracias por su compra!"
              value={settings.ticket_footer || ''}
              onChange={e => updateSetting('ticket_footer', e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs font-medium mb-2 block">Vista Previa del Ticket</label>
          <div className="bg-muted border border-border rounded-2xl p-6 font-mono text-sm max-w-xs mx-auto">
            <div className="text-center border-b border-dashed border-border pb-3 mb-3">
              <p className="font-bold">{settings.business_name || 'Mi Negocio'}</p>
              <p className="text-xs text-muted-foreground">{settings.business_address || ''}</p>
            </div>
            <p className="text-center text-xs text-muted-foreground">Ticket de Venta</p>
            <div className="border-t border-dashed border-border mt-3 pt-3">
              <p className="text-center text-[10px] text-muted-foreground">Gracias por su compra</p>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Appearance */}
      <SettingsSection title="Apariencia" icon={Palette}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium mb-1 block">Tema</label>
            <Select 
              options={themes.map(t => ({value: t, label: t.charAt(0).toUpperCase() + t.slice(1)}))}
              value={theme}
              onChange={setTheme}
              label="Tema"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Color Primario</label>
            <input
              type="color"
              className="h-10 w-full rounded-md border border-border cursor-pointer bg-card"
              value={settings.theme_primary || '#1e88e5'}
              onChange={e => updateSetting('theme_primary', e.target.value)}
            />
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer mt-5">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={settings.compact_mode === '1'}
                onChange={e => updateSetting('compact_mode', e.target.checked ? '1' : '0')}
              />
              <span className="text-sm">Modo Compacto (táctil)</span>
            </label>
          </div>
        </div>
      </SettingsSection>

      {/* Branding */}
      <SettingsSection title="Personalización de Marca" icon={Store}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium mb-1 block">Nombre de la Aplicación</label>
            <Input
              placeholder="POS Pro"
              value={settings.app_name || 'POS Pro'}
              onChange={e => updateSetting('app_name', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Copyright del Footer</label>
            <Input
              placeholder="© 2024 Mi Empresa"
              value={settings.app_copyright || ''}
              onChange={e => updateSetting('app_copyright', e.target.value)}
            />
          </div>
        </div>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection title="Notificaciones y Alertas" icon={Bell}>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border"
              checked={settings.sound_enabled === '1'}
              onChange={e => updateSetting('sound_enabled', e.target.checked ? '1' : '0')}
            />
            <span className="text-sm">Sonido al escanear producto</span>
          </label>
          <div className="flex items-center gap-4">
            <label className="text-sm">Alerta de stock bajo cuando queden:</label>
            <Input
              type="number"
              className="w-20"
              value={settings.low_stock_threshold || '5'}
              onChange={e => updateSetting('low_stock_threshold', e.target.value)}
            />
            <span className="text-sm text-muted-foreground">unidades</span>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border"
              checked={settings.require_customer === '1'}
              onChange={e => updateSetting('require_customer', e.target.checked ? '1' : '0')}
            />
            <span className="text-sm">Requerir cliente en cada venta</span>
          </label>
        </div>
      </SettingsSection>
    </div>
  );
};

export default BusinessSettings;
