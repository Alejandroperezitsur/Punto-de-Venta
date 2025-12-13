import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useAppStore } from '../store/useAppStore';
import {
  Settings, Store, Receipt, Palette, Bell, Save, Check,
  Building, Phone, Mail, Globe, Percent, Image
} from 'lucide-react';

const SettingsSection = ({ title, icon: Icon, children }) => (
  <Card className="p-6 space-y-4">
    <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] pb-3 mb-2">
      <Icon className="h-5 w-5 text-[hsl(var(--primary))]" />
      <h3 className="font-semibold text-lg">{title}</h3>
    </div>
    {children}
  </Card>
);

const BusinessSettings = () => {
  const { toggleTheme, theme } = useAppStore();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api('/settings');
      setSettings(data);
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
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert('Error al guardar: ' + e.message);
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
      <div className="flex items-center justify-center h-64 text-[hsl(var(--muted-foreground))]">
        Cargando configuración...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-[hsl(var(--primary))]" />
          <h1 className="text-2xl font-bold">Configuración del Sistema</h1>
        </div>
        <Button onClick={handleSave} isLoading={saving} disabled={saved}>
          {saved ? <Check className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {saved ? 'Guardado' : 'Guardar Cambios'}
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
                <img src={settings.business_logo} alt="Logo" className="h-16 w-16 object-contain rounded-lg border border-[hsl(var(--border))]" />
              ) : (
                <div className="h-16 w-16 rounded-lg border-2 border-dashed border-[hsl(var(--border))] flex items-center justify-center">
                  <Image className="h-6 w-6 text-[hsl(var(--muted-foreground))]" />
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
            <label className="text-xs font-medium mb-1 block">Moneda</label>
            <select
              className="flex h-10 w-full rounded-md border border-[hsl(var(--border))] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              value={settings.currency || 'MXN'}
              onChange={e => updateSetting('currency', e.target.value)}
            >
              <option value="MXN">MXN - Peso Mexicano</option>
              <option value="USD">USD - Dólar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="COP">COP - Peso Colombiano</option>
              <option value="ARS">ARS - Peso Argentino</option>
            </select>
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
                className="h-4 w-4 rounded border-[hsl(var(--border))]"
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
            <label className="text-xs font-medium mb-1 block">Ancho del Ticket (mm)</label>
            <select
              className="flex h-10 w-full rounded-md border border-[hsl(var(--border))] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              value={settings.ticket_width || '80'}
              onChange={e => updateSetting('ticket_width', e.target.value)}
            >
              <option value="58">58mm (Pequeño)</option>
              <option value="80">80mm (Estándar)</option>
            </select>
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
      </SettingsSection>

      {/* Appearance */}
      <SettingsSection title="Apariencia" icon={Palette}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium mb-1 block">Tema</label>
            <select
              className="flex h-10 w-full rounded-md border border-[hsl(var(--border))] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              value={theme}
              onChange={e => { toggleTheme(); }}
            >
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Color Primario</label>
            <input
              type="color"
              className="h-10 w-full rounded-md border border-[hsl(var(--border))] cursor-pointer"
              value={settings.theme_primary || '#1e88e5'}
              onChange={e => updateSetting('theme_primary', e.target.value)}
            />
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer mt-5">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[hsl(var(--border))]"
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
              className="h-4 w-4 rounded border-[hsl(var(--border))]"
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
            <span className="text-sm text-[hsl(var(--muted-foreground))]">unidades</span>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[hsl(var(--border))]"
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
