import React, { useState } from 'react';
import { useUserStore } from '../store/userStore';
import { api } from '../lib/api';
import { User, Lock, Store, Eye, EyeOff, Sun, Moon, ArrowRight, Shield, Zap, BarChart3, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../utils/cn';

const FEATURES = [
  { icon: Zap, label: 'Offline-First', desc: 'Opera sin conexión' },
  { icon: Globe, label: 'Multi-caja', desc: 'Control simultáneo' },
  { icon: Shield, label: 'Inventario', desc: 'Tiempo real' },
  { icon: BarChart3, label: 'Reportes', desc: 'Analytics avanzado' },
];

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
      try { setBranding(JSON.parse(stored)); } catch (e) { console.error('Failed to load branding:', e); }
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
      {/* Dark mode toggle */}
      <button
        onClick={toggleDark}
        className="absolute top-5 right-5 z-20 p-2.5 rounded-xl bg-card/60 backdrop-blur-md border border-border/20 text-muted-foreground hover:text-foreground hover:bg-card/80 transition-all active:scale-95 touch-target shadow-sm"
        aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
      >
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>

      {/* Left branding panel */}
      <div className="hidden lg:flex flex-[1.1] items-center justify-center p-12 relative z-10">
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0" style={{ background: 'var(--gradient-mesh)' }} />
        <div className="absolute inset-0" style={{ background: 'var(--gradient-hero)' }} />
        {/* Dot pattern overlay */}
        <div className="absolute inset-0 dot-pattern opacity-40" />
        {/* Gradient fade at edges */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/40" />

        {/* Floating decorative orbs */}
        <motion.div
          animate={{ y: [-8, 8, -8], x: [-4, 4, -4] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[15%] left-[20%] size-32 rounded-full bg-primary/[0.04] blur-2xl"
        />
        <motion.div
          animate={{ y: [6, -6, 6], x: [3, -3, 3] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-[25%] right-[15%] size-40 rounded-full bg-accent/[0.04] blur-2xl"
        />
        <motion.div
          animate={{ y: [-5, 5, -5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[60%] left-[10%] size-24 rounded-full bg-primary/[0.03] blur-xl"
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex flex-col items-center text-center max-w-lg mx-auto"
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative size-[7rem] rounded-[1.75rem] bg-primary/10 border border-primary/12 flex items-center justify-center mx-auto mb-8 shadow-xl shadow-primary/8 ring-1 ring-primary/8 backdrop-blur-sm"
          >
            {/* Animated glow ring */}
            <div className="absolute inset-0 rounded-[1.75rem] animate-pulse opacity-30" style={{ boxShadow: '0 0 40px 8px hsl(var(--primary) / 0.12)' }} />
            {branding.logo ? (
              <img src={branding.logo} alt="Logo" className="w-full h-full object-contain p-4" />
            ) : (
              <Store className="size-14 text-primary" strokeWidth={1.5} />
            )}
          </motion.div>

          {/* Business name */}
          <h2 className="text-[3rem] font-black tracking-tighter mb-3 text-foreground leading-[1.1]">
            {branding.businessName}
          </h2>
          <p className="text-xs text-primary/60 font-bold tracking-[0.25em] uppercase mb-10">
            {branding.businessSubtitle}
          </p>

          {/* Description */}
          <p className="text-sm text-muted-foreground/60 leading-relaxed max-w-sm font-medium mb-12">
            Plataforma enterprise de punto de venta. Gestiona ventas, inventario y clientes con velocidad y confiabilidad.
          </p>

          {/* Feature pills — frosted glass */}
          <div className="grid grid-cols-2 gap-3.5 w-full max-w-sm">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-card/30 backdrop-blur-md border border-border/10 hover:border-primary/15 hover:-translate-y-0.5 transition-all cursor-default group hover-lift"
              >
                <div className="size-9 rounded-xl bg-primary/6 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                  <f.icon className="size-3.5 text-primary/60" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-foreground/75">{f.label}</p>
                  <p className="text-[10px] text-muted-foreground/40 font-medium">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 lg:p-12 z-10">
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[440px]"
        >
          {/* Mobile branding */}
          <div className="lg:hidden flex flex-col items-center text-center mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="size-[4.5rem] rounded-2xl bg-primary/8 border border-primary/10 flex items-center justify-center mx-auto mb-4"
            >
              {branding.logo ? (
                <img src={branding.logo} alt="Logo" className="w-full h-full object-contain p-2.5" />
              ) : (
                <Store className="size-8 text-primary" />
              )}
            </motion.div>
            <h1 className="text-xl font-bold text-foreground">{branding.businessName}</h1>
            <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-[0.15em] mt-1">
              {branding.businessSubtitle}
            </p>
          </div>

          {/* Login card — premium glassmorphism surface */}
          <div className="relative bg-card/70 backdrop-blur-xl border border-white/[0.06] rounded-[1.5rem] p-7 md:p-9 shadow-2xl shadow-black/[0.06]">
            {/* Gradient top accent */}
            <div className="absolute top-0 left-6 right-6 h-px rounded-full" style={{ background: 'var(--gradient-primary)', opacity: 0.35 }} />

            <div className="mb-8 hidden lg:block">
              <h3 className="text-[1.35rem] font-bold text-foreground tracking-tight">Bienvenido de vuelta</h3>
              <p className="text-sm text-muted-foreground/50 mt-1.5 font-medium">Ingresa tus credenciales para continuar</p>
            </div>

            {/* Offline banner — glass effect */}
            {!navigator.onLine && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 rounded-xl border border-warning/15 bg-warning/5 backdrop-blur-sm px-4 py-3.5 text-sm text-warning font-medium flex items-start gap-3"
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
                    <label className="block text-[11px] font-bold text-foreground/60 pl-1 uppercase tracking-wider">
                      Usuario
                    </label>
                    <div className={cn(
                      'flex items-center gap-3 px-4 h-[3.5rem] rounded-xl border border-border/20 bg-background/20 backdrop-blur-sm transition-all duration-200',
                      'hover:border-border/35 hover:bg-background/40',
                      'focus-within:border-primary/40 focus-within:bg-background/60 focus-within:ring-2 focus-within:ring-primary/10 focus-within:shadow-md focus-within:shadow-primary/8',
                    )}>
                      <User className="w-4 h-4 text-muted-foreground/35 shrink-0" />
                      <input
                        type="text"
                        placeholder="admin"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="username"
                        autoFocus
                        className="flex-1 bg-transparent border-none text-foreground font-medium text-sm placeholder:text-muted-foreground/25 focus:outline-none focus:ring-0"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-foreground/60 pl-1 uppercase tracking-wider">
                      Contraseña
                    </label>
                    <div className={cn(
                      'flex items-center gap-3 px-4 h-[3.5rem] rounded-xl border border-border/20 bg-background/20 backdrop-blur-sm transition-all duration-200',
                      'hover:border-border/35 hover:bg-background/40',
                      'focus-within:border-primary/40 focus-within:bg-background/60 focus-within:ring-2 focus-within:ring-primary/10 focus-within:shadow-md focus-within:shadow-primary/8',
                    )}>
                      <Lock className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        className="flex-1 bg-transparent border-none text-foreground font-medium text-sm placeholder:text-muted-foreground/30 focus:outline-none focus:ring-0"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-muted-foreground/40 hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted/30 touch-target"
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
                      'w-full h-14 mt-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-[0.97]',
                      'text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5',
                      'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg',
                      'touch-target relative overflow-hidden',
                      !loading && 'btn-shimmer',
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
                    <div className="pt-6 mt-6 border-t border-border/15 text-center">
                      <p className="text-[10px] font-bold text-muted-foreground/35 mb-2.5 uppercase tracking-[0.12em]">
                        Acceso de demostración
                      </p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/20 text-sm font-mono font-bold text-foreground/60 border border-border/15">
                        <span>admin</span>
                        <span className="text-muted-foreground/25 font-light">/</span>
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
                            'w-full flex items-center gap-3.5 p-4 rounded-xl border border-border/20 bg-background/40 text-left transition-all duration-150 group',
                            'hover:border-primary/25 hover:bg-primary/[0.03] hover:-translate-y-px hover:shadow-sm',
                            'active:scale-[0.98]',
                            loading && 'opacity-40 cursor-not-allowed',
                            'touch-target',
                          )}>
                          <div className="size-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
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
                    className="w-full h-12 rounded-xl font-bold text-xs border border-border/25 bg-background/40 text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all active:scale-[0.98] touch-target"
                  >
                    Volver al login
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom branding */}
          <p className="text-center text-[10px] font-medium text-muted-foreground/25 mt-8">
            &copy; 2026 POS Pro &middot; APV Labs
          </p>
          <p className="text-center text-[9px] font-semibold text-muted-foreground/15 mt-1 uppercase tracking-[0.15em]">
            Enterprise Point of Sale
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
