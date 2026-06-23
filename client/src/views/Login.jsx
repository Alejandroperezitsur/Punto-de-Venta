import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Eye, EyeOff, Loader2, Sun, Moon } from 'lucide-react';
import { api } from '../lib/api';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../utils/cn';
import { Input } from '../components/ui/Input';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useUserStore();
  const { isDark, toggleDark } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Ingrese usuario y contraseña');
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
      setError(err?.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      {/* Background mesh gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-accent/[0.03]" />
      <div className="absolute -top-48 -right-48 w-[700px] h-[700px] rounded-full bg-primary/[0.05] blur-[80px]" />
      <div className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full bg-accent/[0.04] blur-[80px]" />
      <div className="absolute inset-0 dot-pattern opacity-30" />

      {/* Theme toggle */}
      <button
        onClick={toggleDark}
        className="absolute top-5 right-5 p-3 rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-muted/30 backdrop-blur-sm border border-border/18 transition-all z-10 shadow-sm"
        aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
      >
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>

      {/* Login card */}
      <div className="relative w-full max-w-md px-4">
        <div className="glass-card p-8 sm:p-10 shadow-2xl animate-fade-up">
          {/* Top accent line */}
          <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          {/* Logo & Brand */}
          <div className="text-center mb-8">
            <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 ring-1 ring-primary/12 shadow-sm shadow-primary/8">
              <Store className="size-7 text-primary" />
            </div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              POS Pro
            </h1>
            <p className="text-sm text-muted-foreground/70 mt-1 font-medium">
              Punto de Venta Enterprise
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-danger/15 border border-danger/25 text-sm font-medium text-danger flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-danger shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground/70 mb-2 ml-0.5">
                Usuario
              </label>
              <Input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Ingrese su usuario"
                autoFocus
                autoComplete="username"
                icon={<Store className="size-3.5" />}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground/70 mb-2 ml-0.5">
                Contraseña
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
                autoComplete="current-password"
                showPasswordToggle
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full h-[var(--control-xl)] rounded-xl font-bold text-sm text-primary-foreground mt-2',
                'transition-all duration-200 active:scale-[0.98]',
                'shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25',
                'disabled:opacity-70 disabled:cursor-not-allowed',
                loading ? 'bg-primary/80' : 'bg-primary hover:bg-primary/90',
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Iniciando sesión...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          <p className="text-center text-[11px] text-muted-foreground/50 mt-7 font-medium">
            POS Pro v2026 · Punto de Venta Enterprise
          </p>
        </div>
      </div>
    </div>
  );
}