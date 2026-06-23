import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Sun, Moon, ArrowRight, Shield } from 'lucide-react';
import { api } from '../lib/api';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../context/ThemeContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useUserStore();
  const { isDark, toggleDark } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Ingrese usuario y contrasena');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      login(res.user, res.token);
      navigate('/ventas');
    } catch (err) {
      setError(err?.message || 'Error de autenticacion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      {/* Premium background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-accent/[0.04]" />
      <div className="absolute -top-64 -right-64 w-[800px] h-[800px] rounded-full bg-primary/[0.06] blur-[100px]" />
      <div className="absolute -bottom-64 -left-64 w-[700px] h-[700px] rounded-full bg-accent/[0.05] blur-[100px]" />
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[60px]" />
      <div className="absolute inset-0 dot-pattern opacity-20" />

      {/* Grid lines subtle */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      {/* Theme toggle */}
      <button
        onClick={toggleDark}
        className={cn(
          'absolute top-6 right-6 p-3 rounded-xl backdrop-blur-md border transition-all z-10',
          'text-muted-foreground/60 hover:text-foreground hover:bg-surface-glass/60 border-border/15 shadow-sm',
        )}
        aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
      >
        {isDark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
      </button>

      {/* Login card */}
      <div className={cn(
        'relative w-full max-w-[420px] px-6 transition-all duration-700',
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
      )}>
        <div className="glass-card p-10 sm:p-12 shadow-2xl relative overflow-hidden">
          {/* Top gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          {/* Subtle inner glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/[0.04] rounded-full blur-3xl pointer-events-none" />

          {/* Logo & Brand */}
          <div className={cn(
            'text-center mb-10 transition-all duration-500 delay-100',
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
          )}>
            <div className="size-20 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mx-auto mb-5 ring-1 ring-primary/10 shadow-lg shadow-primary/10">
              <Store className="size-9 text-primary" />
            </div>
            <h1 className="text-3xl font-black text-foreground tracking-tighter">
              POS Pro
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 font-medium tracking-wide">
              Punto de Venta Enterprise
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm font-semibold text-danger flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-danger shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className={cn(
              'transition-all duration-500 delay-200',
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
            )}>
              <label className="block text-sm font-semibold text-foreground/80 mb-2 ml-0.5">
                Usuario
              </label>
              <Input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Ingrese su usuario"
                autoFocus
                autoComplete="username"
                size="lg"
                icon={<Store className="size-4" />}
              />
            </div>

            <div className={cn(
              'transition-all duration-500 delay-300',
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
            )}>
              <label className="block text-sm font-semibold text-foreground/80 mb-2 ml-0.5">
                Contrasena
              </label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Ingrese su contrasena"
                autoComplete="current-password"
                size="lg"
                showPasswordToggle
              />
            </div>

            <div className={cn(
              'transition-all duration-500 delay-[400ms]',
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
            )}>
              <Button
                type="submit"
                isLoading={loading}
                disabled={loading}
                size="xl"
                variant="hero"
                className="w-full font-bold text-base tracking-wide"
              >
                {loading ? 'Iniciando sesion...' : 'Iniciar Sesion'}
                {!loading && <ArrowRight className="size-4 ml-1" />}
              </Button>
            </div>
          </form>

          <div className={cn(
            'mt-8 pt-6 border-t border-border/15 flex items-center justify-center gap-2 transition-all duration-500 delay-500',
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
          )}>
            <Shield className="size-3 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground/50 font-medium">
              POS Pro v2026 · Conexion segura
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
