import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { Palette, Upload, Check } from 'lucide-react';

export default function BrandingView() {
  const [branding, setBranding] = useState({ businessName: 'POS Pro', businessSubtitle: 'Punto de Venta', logo: null as string | null });
  const toast = useToast();

  useEffect(() => {
    const stored = localStorage.getItem('app_branding');
    if (stored) {
      try { setBranding(b => ({ ...b, ...JSON.parse(stored) })); } catch {}
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('app_branding', JSON.stringify(branding));
    window.dispatchEvent(new Event('storage'));
    toast('Marca guardada', 'success');
  };

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBranding(b => ({ ...b, logo: reader.result as string }));
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <PageHeader title="Personalizacion de Marca" description="Cambia logo, nombre y colores" icon={Palette}
        actions={<Button onClick={handleSave} size="sm"><Check className="size-3.5" /> Guardar</Button>}
      />
      <div className="max-w-lg space-y-4">
        <Card>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Nombre del Negocio</label>
              <Input value={branding.businessName} onChange={e => setBranding(b => ({ ...b, businessName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Subtitulo</label>
              <Input value={branding.businessSubtitle} onChange={e => setBranding(b => ({ ...b, businessSubtitle: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Logo</label>
              <div className="flex items-center gap-4">
                {branding.logo && <img src={branding.logo} alt="Logo" className="size-16 object-contain rounded-lg border border-border-subtle" />}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleLogo} className="hidden" />
                  <span className="px-4 py-2 rounded-lg bg-bg-inset text-sm font-medium text-text-secondary hover:bg-bg-surface-hover transition-colors inline-flex items-center gap-2">
                    <Upload className="size-3.5" /> Subir Logo
                  </span>
                </label>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
