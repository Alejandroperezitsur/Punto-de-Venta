import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, Download, Upload, RotateCcw, Check,
  Sun, Moon, Eye, Smartphone, Monitor,
  Square, Circle, Maximize, Type,
  Trash2, Copy, CheckCheck
} from 'lucide-react';

export default function ThemeStudio() {
  const { theme, setTheme, isDark, toggleDark } = useTheme();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('themes');
  const [customAccent, setCustomAccent] = useState(() => {
    return localStorage.getItem('theme-accent') || '';
  });
  const [radius, setRadius] = useState(() => {
    return parseInt(localStorage.getItem('theme-radius') || '16');
  });
  const [density, setDensity] = useState(() => {
    return localStorage.getItem('theme-density') || 'comfortable';
  });
  const [glassEnabled, setGlassEnabled] = useState(() => {
    return localStorage.getItem('theme-glass') !== 'false';
  });
  const [copied, setCopied] = useState(false);
  
  const themes = [
    { id: 'dark', name: 'Dark', icon: Moon, desc: 'True black, OLED-ready' },
    { id: 'light', name: 'Light', icon: Sun, desc: 'Clean and bright' },
    { id: 'emerald', name: 'Emerald', icon: Square, desc: 'Fresh green accent' },
    { id: 'violet', name: 'Violet', icon: Square, desc: 'Royal purple tones' },
    { id: 'orange', name: 'Orange', icon: Square, desc: 'Warm amber glow' },
    { id: 'graphite', name: 'Graphite', icon: Square, desc: 'Professional gray' },
    { id: 'midnight', name: 'Midnight', icon: Square, desc: 'Deep navy blue' },
    { id: 'rose', name: 'Rose', icon: Square, desc: 'Soft pink blush' },
    { id: 'cyber', name: 'Cyber', icon: Square, desc: 'Neon cyberpunk' },
    { id: 'corporate', name: 'Corporate', icon: Square, desc: 'Enterprise blue' },
  ];

  const densities = [
    { value: 'compact', label: 'Compacto', desc: 'Máxima densidad de información' },
    { value: 'comfortable', label: 'Cómodo', desc: 'Balance ideal' },
    { value: 'spacious', label: 'Espacioso', desc: 'Máxima legibilidad' },
  ];

  const radiusOptions = [
    { value: 8, label: 'Sutil' },
    { value: 12, label: 'Suave' },
    { value: 16, label: 'Normal' },
    { value: 20, label: 'Redondo' },
    { value: 24, label: 'Muy redondo' },
  ];

  const handleAccentChange = (color) => {
    setCustomAccent(color);
    localStorage.setItem('theme-accent', color);
    document.documentElement.style.setProperty('--accent', color);
    if (color) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0,2), 16) / 255;
      const g = parseInt(hex.substring(2,4), 16) / 255;
      const b = parseInt(hex.substring(4,6), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0;
      if (max !== min) {
        const d = max - min;
        switch(max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
          case g: h = ((b - r) / d + 2) * 60; break;
          case b: h = ((r - g) / d + 4) * 60; break;
        }
      }
      document.documentElement.style.setProperty('--primary-hue', Math.round(h));
    }
    toast('Color de acento actualizado', 'success');
  };

  const handleRadiusChange = (val) => {
    setRadius(val);
    localStorage.setItem('theme-radius', val.toString());
    document.documentElement.style.setProperty('--radius', `${val}px`);
  };

  const handleDensityChange = (val) => {
    setDensity(val);
    localStorage.setItem('theme-density', val);
    const spacing = val === 'compact' ? '0.75' : val === 'comfortable' ? '1' : '1.5';
    document.documentElement.style.setProperty('--spacing', `${spacing}rem`);
  };

  const handleGlassToggle = () => {
    const newVal = !glassEnabled;
    setGlassEnabled(newVal);
    localStorage.setItem('theme-glass', newVal.toString());
    document.documentElement.style.setProperty('--glass-enabled', newVal ? '1' : '0');
  };

  const exportTheme = () => {
    const config = {
      theme,
      accent: customAccent,
      radius,
      density,
      glass: glassEnabled,
      isDark,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-${theme}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Tema exportado', 'success');
  };

  const importTheme = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const config = JSON.parse(ev.target.result);
          if (config.theme) setTheme(config.theme);
          if (config.accent) handleAccentChange(config.accent);
          if (config.radius) handleRadiusChange(config.radius);
          if (config.density) handleDensityChange(config.density);
          if (config.glass !== undefined) {
            setGlassEnabled(config.glass);
            localStorage.setItem('theme-glass', config.glass.toString());
          }
          toast('Tema importado correctamente', 'success');
        } catch {
          toast('Archivo de tema inválido', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const resetTheme = () => {
    setTheme('dark');
    setCustomAccent('');
    handleRadiusChange(16);
    handleDensityChange('comfortable');
    setGlassEnabled(true);
    localStorage.removeItem('theme-accent');
    localStorage.removeItem('theme-radius');
    localStorage.removeItem('theme-density');
    localStorage.removeItem('theme-glass');
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--primary-hue');
    document.documentElement.style.removeProperty('--radius');
    document.documentElement.style.removeProperty('--spacing');
    document.documentElement.style.removeProperty('--glass-enabled');
    toast('Tema restablecido a valores de fábrica', 'success');
  };

  const copyConfig = () => {
    const config = {
      theme, accent: customAccent, radius, density, glass: glassEnabled, isDark
    };
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast('Configuración copiada', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Theme Studio</h1>
          <p className="text-muted-foreground">Personaliza la apariencia de tu sistema POS</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={importTheme}>
            <Upload className="size-4 mr-2" />
            Importar
          </Button>
          <Button variant="ghost" onClick={exportTheme}>
            <Download className="size-4 mr-2" />
            Exportar
          </Button>
          <Button variant="ghost" onClick={copyConfig}>
            {copied ? <CheckCheck className="size-4" /> : <Copy className="size-4" />}
          </Button>
          <Button variant="outline" onClick={resetTheme}>
            <RotateCcw className="size-4 mr-2" />
            Restablecer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <div className="xl:col-span-2 space-y-6">
          {/* Tab selector */}
          <div className="flex gap-1 bg-muted p-1 rounded-2xl w-fit">
            {['themes', 'adjust', 'preview'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'themes' ? 'Temas' : tab === 'adjust' ? 'Ajustes' : 'Vista previa'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'themes' && (
              <motion.div key="themes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {themes.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`relative p-4 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                        theme === t.id ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' : 'border-border bg-card hover:border-muted-foreground/30'
                      }`}
                    >
                      {theme === t.id && (
                        <motion.div layoutId="themeCheck" className="absolute top-2 right-2 size-5 bg-primary rounded-full flex items-center justify-center">
                          <Check className="size-3 text-white" />
                        </motion.div>
                      )}
                      <div className={`size-8 rounded-full mb-2 flex items-center justify-center ${t.id === 'dark' ? 'bg-gray-900 text-white' : t.id === 'light' ? 'bg-white text-gray-900 border' : 'bg-muted'}`}>
                        <Icon className="size-4" />
                      </div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground">{t.desc}</p>
                    </button>
                  );
                })}
              </motion.div>
            )}

            {activeTab === 'adjust' && (
              <motion.div key="adjust" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                {/* Custom accent */}
                <Card variant="outline" className="p-5">
                  <label className="text-sm font-medium mb-3 block">Color de acento personalizado</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={customAccent || '#6366f1'}
                      onChange={(e) => handleAccentChange(e.target.value)}
                      className="size-12 rounded-xl border border-border cursor-pointer bg-transparent"
                    />
                    <Input
                      value={customAccent}
                      onChange={(e) => handleAccentChange(e.target.value)}
                      placeholder="#6366f1"
                      className="w-32"
                    />
                    {customAccent && (
                      <Button variant="ghost" size="sm" onClick={() => handleAccentChange('')}>
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </Card>

                {/* Border radius */}
                <Card variant="outline" className="p-5">
                  <label className="text-sm font-medium mb-3 block">Radio de bordes: {radius}px</label>
                  <div className="flex gap-2">
                    {radiusOptions.map(r => (
                      <button
                        key={r.value}
                        onClick={() => handleRadiusChange(r.value)}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                          radius === r.value ? 'bg-primary text-white shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="32"
                    value={radius}
                    onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                    className="w-full mt-3 accent-primary"
                  />
                </Card>

                {/* Density */}
                <Card variant="outline" className="p-5">
                  <label className="text-sm font-medium mb-3 block">Densidad</label>
                  <div className="flex gap-2">
                    {densities.map(d => (
                      <button
                        key={d.value}
                        onClick={() => handleDensityChange(d.value)}
                        className={`flex-1 p-3 rounded-xl text-left transition-all ${
                          density === d.value ? 'bg-primary/10 border-2 border-primary' : 'bg-muted border-2 border-transparent hover:border-muted-foreground/20'
                        }`}
                      >
                        <p className="text-sm font-medium capitalize">{d.label}</p>
                        <p className="text-[11px] text-muted-foreground">{d.desc}</p>
                      </button>
                    ))}
                  </div>
                </Card>

                {/* Glass toggle */}
                <Card variant="outline" className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium block">Efecto Glass</label>
                      <p className="text-xs text-muted-foreground">Paneles semitransparentes con blur</p>
                    </div>
                    <button
                      onClick={handleGlassToggle}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        glassEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    >
                      <motion.div
                        animate={{ x: glassEnabled ? 20 : 2 }}
                        className="absolute top-1 size-5 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>
                </Card>
              </motion.div>
            )}

            {activeTab === 'preview' && (
              <motion.div key="preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <Card variant="outline" className="p-6 space-y-4">
                  <p className="text-sm font-medium">Componentes</p>
                  <div className="flex flex-wrap gap-2">
                    <Button>Primario</Button>
                    <Button variant="secondary">Secundario</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>Default</Badge>
                    <Badge variant="success">Éxito</Badge>
                    <Badge variant="danger">Peligro</Badge>
                    <Badge variant="info">Info</Badge>
                    <Badge variant="warning">Advertencia</Badge>
                  </div>
                  <Input placeholder="Campo de texto..." />
                </Card>
                <Card variant="outline" className="p-6 space-y-3">
                  <p className="text-sm font-medium">Tipografía</p>
                  <p className="text-2xl font-bold">Título grande</p>
                  <p className="text-lg font-semibold">Subtítulo</p>
                  <p className="text-base">Texto normal con <span className="text-primary">acento</span> y <span className="text-muted-foreground">secundario</span></p>
                  <p className="text-sm text-muted-foreground">Texto pequeño de ayuda o descripción</p>
                </Card>
                <Card variant="outline" className="p-6">
                  <p className="text-sm font-medium mb-3">Tarjetas</p>
                  <div className="grid grid-cols-3 gap-3">
                    {['bg-card', 'bg-muted', 'bg-primary/10'].map(bg => (
                      <div key={bg} className={`${bg} rounded-2xl p-4 border border-border`}>
                        <div className="size-8 rounded-lg bg-primary/20 mb-2" />
                        <div className="h-2 w-3/4 bg-muted-foreground/20 rounded mb-1" />
                        <div className="h-2 w-1/2 bg-muted-foreground/10 rounded" />
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Current theme info */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <p className="text-sm font-medium">Tema activo</p>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-2xl">
              <div className={`size-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900 border'}`}>
                {isDark ? <Moon className="size-5" /> : <Sun className="size-5" />}
              </div>
              <div>
                <p className="font-medium capitalize">{theme}</p>
                <p className="text-xs text-muted-foreground">{isDark ? 'Oscuro' : 'Claro'}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Radio</span><span>{radius}px</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Densidad</span><span className="capitalize">{density}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Glass</span><span>{glassEnabled ? 'Activado' : 'Desactivado'}</span></div>
              {customAccent && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Acento</span>
                  <div className="flex items-center gap-2">
                    <div className="size-4 rounded" style={{ backgroundColor: customAccent }} />
                    <span className="text-xs">{customAccent}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <p className="text-sm font-medium">Atajos</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><kbd className="px-2 py-0.5 bg-muted rounded text-[10px]">T</kbd><span className="text-muted-foreground">Alternar tema</span></div>
              <div className="flex justify-between"><kbd className="px-2 py-0.5 bg-muted rounded text-[10px]">R</kbd><span className="text-muted-foreground">Restablecer</span></div>
              <div className="flex justify-between"><kbd className="px-2 py-0.5 bg-muted rounded text-[10px]">E</kbd><span className="text-muted-foreground">Exportar</span></div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Vista rápida</p>
              <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
                <button className="p-1.5 rounded-md bg-card shadow-sm"><Monitor className="size-3.5" /></button>
                <button className="p-1.5 rounded-md text-muted-foreground"><Smartphone className="size-3.5" /></button>
              </div>
            </div>
            <div className="aspect-[4/3] bg-muted rounded-2xl p-3 border border-border">
              <div className="h-full rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-2">
                <div className="flex gap-1.5 mb-2">
                  <div className="size-1.5 rounded-full bg-danger" />
                  <div className="size-1.5 rounded-full bg-warning" />
                  <div className="size-1.5 rounded-full bg-success" />
                </div>
                <div className="h-1.5 w-3/4 bg-card/50 rounded-sm mb-1" />
                <div className="h-1.5 w-1/2 bg-card/30 rounded-sm" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
