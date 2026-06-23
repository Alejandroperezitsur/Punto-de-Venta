import React, { useState, useEffect } from 'react';
import { Upload, Download, RotateCcw, Store } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { useToast } from '../components/ui/Toast';
import { ConfirmModal } from '../components/sales/ConfirmModal';

const Branding = () => {
  const [branding, setBranding] = useState({
    logo: null,
    banner: null,
    businessName: 'Punto de Venta',
    businessSubtitle: 'Sistema Profesional de Gestión',
    primaryColor: '#3b82f6',
  });
  const [loading, setLoading] = useState(false);
  const [isResetOpen, setResetOpen] = useState(false);
  const toast = useToast();

  // Load branding from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('app_branding');
    if (stored) {
      try {
        setBranding(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load branding:', e);
      }
    }
  }, []);

  const saveBranding = (newBranding) => {
    try {
      localStorage.setItem('app_branding', JSON.stringify(newBranding));
      setBranding(newBranding);
      toast('Personalización guardada correctamente', 'success');
    } catch (e) {
      toast('Error al guardar personalización', 'error');
      console.error(e);
    }
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
      toast('La imagen no debe exceder 500KB', 'error');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast('Solo se permiten archivos de imagen', 'error');
      return;
    }

    setLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target?.result;
      const updated = { ...branding, [type]: dataUrl };
      saveBranding(updated);
      setLoading(false);
    };

    reader.onerror = () => {
      toast('Error al leer el archivo', 'error');
      setLoading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (type) => {
    const updated = { ...branding, [type]: null };
    saveBranding(updated);
  };

  const handleTextChange = (field, value) => {
    const updated = { ...branding, [field]: value };
    saveBranding(updated);
  };

  const handleColorChange = (value) => {
    const updated = { ...branding, primaryColor: value };
    saveBranding(updated);
  };

  const handleReset = () => {
    setResetOpen(true);
  };

  const handleResetConfirm = () => {
    const defaults = {
      logo: null,
      banner: null,
      businessName: 'Punto de Venta',
      businessSubtitle: 'Sistema Profesional de Gestión',
      primaryColor: '#3b82f6',
    };
    saveBranding(defaults);
    toast('Configuración restaurada', 'success');
    setResetOpen(false);
  };

  return (
    <>
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Store className="size-8 text-primary" />
            <h1 className="text-3xl font-black">Personalización</h1>
          </div>
          <p className="text-muted-foreground">
            Personaliza tu sistema POS con tu marca y logo
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-8"
        >
          {/* Logo Section */}
          <div className="bg-card rounded-lg p-6 border border-border/20">
            <h2 className="text-xl font-bold mb-4">Logo</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Upload Area */}
              <div className="md:col-span-2">
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'logo')}
                    disabled={loading}
                    className="hidden"
                  />
                  <div
                    className={cn(
                      'flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-border/50 cursor-pointer transition-all',
                      'hover:border-primary/50 hover:bg-primary/5',
                      loading && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Upload className="size-8 text-muted-foreground mb-2" />
                    <p className="font-semibold text-sm">Haz clic para subir logo</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG (máx 500KB)
                    </p>
                  </div>
                </label>
              </div>

              {/* Preview */}
              <div className="flex items-center justify-center p-4 bg-surface-hover rounded-lg min-h-[200px]">
                {branding.logo ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={branding.logo}
                      alt="Logo"
                      className="max-w-full max-h-full object-contain"
                    />
                    <button
                      onClick={() => handleRemoveImage('logo')}
                      className="absolute top-2 right-2 p-1.5 bg-danger/90 text-white rounded-lg hover:bg-danger transition-colors"
                      title="Eliminar"
                    >
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Store className="size-12 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Sin logo</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Banner Section */}
          <div className="bg-card rounded-lg p-6 border border-border/20">
            <h2 className="text-xl font-bold mb-4">Banner</h2>
            <div className="space-y-4">
              {/* Upload Area */}
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'banner')}
                  disabled={loading}
                  className="hidden"
                />
                <div
                  className={cn(
                    'flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-border/50 cursor-pointer transition-all',
                    'hover:border-primary/50 hover:bg-primary/5',
                    loading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Upload className="size-8 text-muted-foreground mb-2" />
                  <p className="font-semibold text-sm">Haz clic para subir banner</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG (recomendado: 1200x300px, máx 500KB)
                  </p>
                </div>
              </label>

              {/* Preview */}
              {branding.banner && (
                <div className="relative rounded-lg overflow-hidden bg-surface-hover h-32">
                  <img
                    src={branding.banner}
                    alt="Banner"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleRemoveImage('banner')}
                    className="absolute top-2 right-2 p-1.5 bg-danger/90 text-white rounded-lg hover:bg-danger transition-colors"
                    title="Eliminar"
                  >
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Business Info Section */}
          <div className="bg-card rounded-lg p-6 border border-border/20">
            <h2 className="text-xl font-bold mb-4">Información del Negocio</h2>
            <div className="space-y-4">
              {/* Business Name */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nombre del Negocio
                </label>
                <input
                  type="text"
                  value={branding.businessName}
                  onChange={(e) => handleTextChange('businessName', e.target.value)}
                  placeholder="Ej: Mi Supermercado"
                  className="w-full px-4 h-12 rounded-lg bg-surface-hover border-none text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Business Subtitle */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Subtítulo/Eslogan
                </label>
                <input
                  type="text"
                  value={branding.businessSubtitle}
                  onChange={(e) => handleTextChange('businessSubtitle', e.target.value)}
                  placeholder="Ej: Sistema Profesional de Gestión"
                  className="w-full px-4 h-12 rounded-lg bg-surface-hover border-none text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>

          {/* Color Section */}
          <div className="bg-card rounded-lg p-6 border border-border/20">
            <h2 className="text-xl font-bold mb-4">Color Principal</h2>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={branding.primaryColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-20 h-12 rounded-lg cursor-pointer"
              />
              <div>
                <p className="font-mono text-sm text-muted-foreground">
                  {branding.primaryColor}
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Se aplica en botones, iconos y acentos
                </p>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="bg-card rounded-lg p-6 border border-border/20">
            <h2 className="text-xl font-bold mb-4">Vista Previa</h2>
            <div className="rounded-lg bg-surface-hover overflow-hidden">
              {branding.banner && (
                <div className="h-24 overflow-hidden">
                  <img
                    src={branding.banner}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6 flex items-center gap-4">
                {branding.logo && (
                  <div className="w-16 h-16 rounded-lg bg-surface flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={branding.logo}
                      alt="Logo preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg">{branding.businessName}</h3>
                  <p className="text-sm text-muted-foreground">{branding.businessSubtitle}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-2 px-4 h-12 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all font-semibold"
            >
              <RotateCcw className="size-5" />
              Restaurar Predeterminados
            </button>
            <button
              onClick={() => {
                const data = JSON.stringify(branding);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'branding-backup.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 h-12 rounded-lg bg-surface-hover border border-border/50 text-foreground hover:bg-surface-active transition-all font-semibold"
            >
              <Download className="size-5" />
              Descargar Copia
            </button>
          </div>
        </motion.div>
      </div>
      </div>
      <ConfirmModal
        open={isResetOpen}
        title="Restaurar Configuración"
        message="¿Restaurar configuración predeterminada? Se perderán tus personalizaciones."
        confirmLabel="Restaurar"
        variant="warning"
        onConfirm={handleResetConfirm}
        onCancel={() => setResetOpen(false)}
      />
    </>
  );
};

export default Branding;
