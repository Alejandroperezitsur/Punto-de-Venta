import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Store, ArrowRight, Check } from 'lucide-react';

const STEPS = ['Negocio', 'Admin', 'Listo'];

export default function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ businessName: '', adminUser: 'admin', adminPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: form.businessName,
          admin_username: form.adminUser,
          admin_password: form.adminPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al configurar');
      setStep(2);
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-bg-app flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="size-14 rounded-xl bg-action-primary flex items-center justify-center mx-auto mb-4">
            <Store className="size-7 text-[var(--bg-surface)]" />
          </div>
          <h1 className="text-[var(--text-heading-lg)] font-bold text-text-primary">Configuracion Inicial</h1>
          <p className="text-sm text-text-secondary mt-1">Paso {step + 1} de 3</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 px-2">
          {STEPS.map((label, i) => (
            <React.Fragment key={i}>
              <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                i <= step ? 'bg-action-primary text-[var(--bg-surface)]' : 'bg-bg-inset text-text-tertiary'
              }`}>
                {i < step ? <Check className="size-3" /> : i + 1}
              </div>
              <span className={`text-xs font-semibold ${i <= step ? 'text-text-primary' : 'text-text-disabled'}`}>{label}</span>
              {i < 2 && <div className={`flex-1 h-px ${i < step ? 'bg-action-primary' : 'bg-border-subtle'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-bg-surface border border-border-subtle rounded-xl p-6 shadow-dialog">
          {step === 0 && (
            <form onSubmit={(e) => { e.preventDefault(); if (form.businessName) setStep(1); }} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Nombre del Negocio</label>
                <Input value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} placeholder="Mi Tienda" autoFocus required />
              </div>
              <Button type="submit" className="w-full">Siguiente <ArrowRight className="size-4" /></Button>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Usuario Administrador</label>
                <Input value={form.adminUser} onChange={e => setForm(f => ({ ...f, adminUser: e.target.value }))} autoFocus required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Contrasena</label>
                <Input type="password" value={form.adminPassword} onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))} required minLength={4} />
              </div>
              {error && <div className="p-3 rounded-lg bg-danger-bg text-danger-text text-xs font-semibold text-center">{error}</div>}
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setStep(0)}>Atras</Button>
                <Button type="submit" className="flex-1" isLoading={loading}>Crear Sistema</Button>
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="text-center py-4">
              <div className="size-16 rounded-full bg-success-bg flex items-center justify-center mx-auto mb-4">
                <Check className="size-8 text-success" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Todo listo!</h3>
              <p className="text-sm text-text-secondary mb-6">Tu sistema esta configurado. Inicia sesion para comenzar.</p>
              <Button onClick={() => navigate('/login')} className="w-full">
                Ir al Inicio de Sesion
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
