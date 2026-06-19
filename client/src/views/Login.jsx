import React, { useState } from 'react';
import { useUserStore } from '../store/userStore';
import { api } from '../lib/api';
import { User, Lock, Store, Eye, EyeOff, Sun, Moon, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../utils/cn';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('login');
  const [stores, setStores] = useState([]);
  const [tempToken, setTempToken] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [branding, setBranding] = useState({
    logo: null,
    banner: null,
    businessName: 'Punto de Venta',
    businessSubtitle: 'Sistema Profesional de Gestión',
    primaryColor: '#3b82f6',
  });
  const isProd = import.meta.env.PROD;
  const login = useUserStore(state => state.login);
  const navigate = useNavigate();
  const { isDark, toggleDark } = useTheme();

  React.useEffect(() => {
    const stored = localStorage.getItem('app_branding');
    if (stored) {
      try {
        setBranding(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load branding:', e);
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: email, password }),
      });

      if (res.requireStoreSelection) {
        setStores(res.stores);
        setTempToken(res.tempToken);
        setStep('select-store');
      } else if (res.token) {
        login(res.user, res.token);
        navigate('/ventas');
      } else {
        setError('Error desconocido');
      }
    } catch (e) {
      setError(e.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStore = async (storeId) => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/auth/select-store', {
        method: 'POST',
        body: JSON.stringify({ storeId, tempToken }),
      });
      if (res.token) {
        login(res.user, res.token);
        navigate('/ventas');
      }
    } catch (e) {
      setError(e.message || 'Error al seleccionar tienda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background relative overflow-hidden font-sans">
      {/* Dark mode toggle — top right */}
      <button
        onClick={toggleDark}
        className="absolute top-4 right-4 z-20 p-2.5 rounded-xl bg-card/80 backdrop-blur-sm border border-border/30 text-muted-foreground hover:text-foreground hover:bg-card transition-all active:scale-95 touch-target shadow-sm"
        aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
      >
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>

      {/* Left branding panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative z-10">
        {/* Animated gradient background */}
        <div className="absolute inset-0" style={{ background: 'var(--gradient-hero-scan, linear-gradient(135deg, hsl(var(--primary) / 0.06) 0%, transparent 50%, hsl(var(--accent) / 0.06) 100%))' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/30" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex flex-col items-center text-center max-w-lg mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
            className="size-24 rounded-2xl bg-primary/10 border border-primary/12 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-primary/8 ring-1 ring-primary/8"
          >
            {branding.logo ? (
              <img src={branding.logo} alt="Logo" className="w-full h-full object-contain p-3" />
            ) : (
              <Store className="size-12 text-primary" />
            )}
          </motion.div>
          <h2 className="text-4xl font-black tracking-tight mb-3 text-foreground">
            {branding.businessName}
          </h2>
          <p className="text-sm text-primary/80 font-semibold tracking-[0.15em] uppercase mb-6">
            {branding.businessSubtitle}
          </p>
          <p className="text-sm text-muted-foreground/70 leading-relaxed max-w-sm font-medium">
            Gestiona ventas, inventario y clientes con una plataforma moderna, rápida y confiable.
          </p>

          {/* Feature pills — glass effect */}
          <div className="flex flex-wrap gap-2.5 mt-10 justify-center">
            {['Offline', 'Multi-caja', 'Inventario', 'Reportes'].map(f => (
              <span key={f} className="px-3.5 py-2 rounded-xl glass-panel text-[11px] font-semibold text-muted-foreground/70 hover:-translate-y-px transition-all cursor-default">
                {f}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 lg:p-12 z-10">
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile branding */}
          <div className="lg:hidden flex flex-col items-center text-center mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="size-16 rounded-2xl bg-primary/8 border border-primary/10 flex items-center justify-center mx-auto mb-4"
            >
              {branding.logo ? (
                <img src={branding.logo} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <Store className="size-7 text-primary" />
              )}
            </motion.div>
            <h1 className="text-xl font-bold text-foreground">{branding.businessName}</h1>
            <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-[0.15em] mt-1">
              {branding.businessSubtitle}
            </p>
          </div>

          {/* Login card */}
          <div className="bg-card border border-border/25 rounded-2xl p-6 md:p-8 shadow-xl shadow-black/[0.04] gradient-border">
            <div className="mb-7 hidden lg:block">
              <h3 className="text-xl font-bold text-foreground">Bienvenido de vuelta</h3>
              <p className="text-sm text-muted-foreground/60 mt-1.5 font-medium">Ingresa tus credenciales para continuar</p>
            </div>

            {!navigator.onLine && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 rounded-xl border border-warning/15 bg-warning/6 px-4 py-3.5 text-sm text-warning font-medium flex items-start gap-3"
                role="alert"
              >
                <div className="mt-0.5 text-base" aria-hidden="true">⚠</div>
                <div>
                  <strong className="block mb-0.5 text-xs font-bold">Modo offline activo</strong>
                  <span className="text-xs opacity-80">Inicia sesión con <span className="font-bold">admin</span> / <span className="font-bold">admin123</span></span>
                </div>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {step === 'login' ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-foreground/70 pl-0.5">
                      Usuario
                    </label>
                    <div className={cn(
                      'flex items-center gap-3 px-4 h-[var(--control-lg)] rounded-xl border border-border/40 bg-background/50 transition-all duration-100',
                      'hover:border-border/60 hover:bg-background/70',
                      'focus-within:border-primary/40 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/8',
                    )}>
                      <User className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                      <input
                        type="text"
                        placeholder="admin"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="username"
                        autoFocus
                        className="flex-1 bg-transparent border-none text-foreground font-medium text-sm placeholder:text-muted-foreground/35 focus:outline-none focus:ring-0"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-foreground/70 pl-0.5">
                      Contraseña
                    </label>
                    <div className={cn(
                      'flex items-center gap-3 px-4 h-[var(--control-lg)] rounded-xl border border-border/40 bg-background/50 transition-all duration-100',
                      'hover:border-border/60 hover:bg-background/70',
                      'focus-within:border-primary/40 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/8',
                    )}>
                      <Lock className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        className="flex-1 bg-transparent border-none text-foreground font-medium text-sm placeholder:text-muted-foreground/35 focus:outline-none focus:ring-0"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-muted-foreground/50 hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted/30 touch-target"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -8, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-3 px-4 py-3 mt-1 rounded-xl bg-danger/8 border border-danger/15 text-danger" role="alert">
                          <span className="size-1.5 rounded-full bg-danger shrink-0" />
                          <p className="text-xs font-semibold">{error}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      'w-full h-[var(--control-lg)] mt-2 rounded-xl font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.98]',
                      'text-primary-foreground shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-px',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'touch-target',
                    )}
                    style={{ background: 'var(--gradient-primary)' }}
                  >
                    {loading ? (
                      <>
                        <span className="size-4 rounded-full border-2 border-primary-foreground/25 border-t-primary-foreground animate-spin" />
                        Iniciando...
                      </>
                    ) : (
                      <>
                        Iniciar Sesión
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </button>

                  {!isProd && (
                    <div className="pt-5 mt-5 border-t border-border/20 text-center">
                      <p className="text-[10px] font-semibold text-muted-foreground/40 mb-2 uppercase tracking-[0.1em]">
                        Acceso de demostración
                      </p>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 text-sm font-mono font-bold text-foreground/70 border border-border/20">
                        <span>admin</span>
                        <span className="text-muted-foreground/30">/</span>
                        <span>admin123</span>
                      </div>
                    </div>
                  )}
                </motion.form>
              ) : (
                <motion.div
                  key="select-store"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <div>
                    <h3 className="text-lg font-bold mb-5 text-foreground">Selecciona tu Tienda</h3>
                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                      {stores.map(store => (
                        <button
                          key={store.id}
                          onClick={() => handleSelectStore(store.id)}
                          disabled={loading}
                          className={cn(
                            'w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-border/25 bg-background/50 text-left transition-all duration-150 group',
                            'hover:border-primary/30 hover:bg-primary/[0.03] hover:-translate-y-px hover:shadow-sm',
                            'active:scale-[0.98]',
                            loading && 'opacity-40 cursor-not-allowed',
                            'touch-target',
                          )}>
                          <div className="size-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                            <Store className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{store.name}</p>
                            <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mt-0.5">
                              {store.role}
                            </p>
                          </div>
                          <div className="w-7 h-7 rounded-full bg-success/8 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="w-3.5 h-3.5 text-success" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => { setStep('login'); setPassword(''); setError(''); }}
                    className="w-full h-[var(--control-lg)] rounded-xl font-bold text-xs border border-border/30 bg-background/50 text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all active:scale-[0.98] touch-target"
                  >
                    Volver al login
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom branding */}
          <p className="text-center text-[10px] font-medium text-muted-foreground/30 mt-6">
            &copy; 2026 POS Pro &middot; APV Labs
          </p>
          <p className="text-center text-[9px] font-semibold text-muted-foreground/20 mt-1 uppercase tracking-[0.15em]">
            Powered by POS Pro
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
