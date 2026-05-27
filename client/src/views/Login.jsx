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
  const login = useUserStore(state => state.login);
  const navigate = useNavigate();
  const { isDark, toggleDark } = useTheme();

  // Load branding from localStorage
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
      {/* Background ambient light */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      </div>

      {/* Left side - Branding */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-8 relative overflow-hidden z-10 border-r border-border/5">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            animate={{ x: [0, 30, -20, 0], y: [0, -30, 20, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[10%] left-[10%] w-[40%] h-[40%] rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
          <motion.div
            animate={{ x: [0, -20, 30, 0], y: [0, 20, -30, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-[10%] right-[10%] w-[45%] h-[45%] rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, transparent 70%)',
              filter: 'blur(100px)',
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 flex flex-col items-center text-center max-w-lg mx-auto px-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.2 }}
            className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-primary/30 ring-1 ring-white/10"
          >
            {branding.logo ? (
              <img src={branding.logo} alt="Logo" className="w-full h-full object-contain p-3" />
            ) : (
              <Store className="w-14 h-14 text-white drop-shadow-md" />
            )}
          </motion.div>
          <h2 className="text-5xl font-extrabold tracking-tight mb-4 text-foreground drop-shadow-sm">
            {branding.businessName}
          </h2>
          <p className="text-xl text-primary font-semibold mb-6 tracking-wide uppercase text-sm">
            {branding.businessSubtitle}
          </p>
          <p className="text-base text-muted-foreground leading-relaxed max-w-md mx-auto font-medium">
            Gestiona tus ventas, inventario y clientes con una plataforma moderna y confiable.
            <br className="hidden md:block" /> Disponible offline para mayor flexibilidad.
          </p>
        </motion.div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 lg:p-12 z-10">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-full max-w-[440px] bg-card/60 backdrop-blur-2xl border border-border/50 rounded-[2.5rem] p-8 md:p-12 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] relative overflow-hidden"
        >
          {/* Subtle top glare */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center text-center mb-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/25"
            >
              {branding.logo ? (
                <img src={branding.logo} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <Store className="w-10 h-10 text-white" />
              )}
            </motion.div>
            <h1 className="text-3xl font-extrabold tracking-tight">{branding.businessName}</h1>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mt-2">
              {branding.businessSubtitle}
            </p>
          </div>

          <div className="mb-8 hidden lg:block">
            <h3 className="text-2xl font-bold text-foreground">Bienvenido de vuelta</h3>
            <p className="text-sm text-muted-foreground mt-2 font-medium">Ingresa tus credenciales para continuar</p>
          </div>

          {!navigator.onLine && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 rounded-2xl border border-amber-200/50 bg-amber-500/10 px-5 py-4 text-sm text-amber-600 dark:text-amber-400 font-medium flex items-start gap-3"
            >
              <div className="mt-0.5">⚠️</div>
              <div>
                <strong className="block mb-1">Modo offline activo</strong>
                Inicia sesión con <span className="font-bold opacity-80">admin</span> / <span className="font-bold opacity-80">admin123</span> o restaura tu sesión local.
              </div>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {step === 'login' ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                <div className="space-y-2.5">
                  <label className="block text-sm font-bold text-foreground/80 pl-1">
                    Usuario
                  </label>
                  <div className={cn(
                    'flex items-center gap-3 px-4 h-14 rounded-2xl border border-border/60 bg-background/50 transition-all duration-300',
                    'hover:border-border hover:bg-background/80',
                    'focus-within:!border-primary focus-within:!bg-background focus-within:ring-4 focus-within:ring-primary/10',
                  )}>
                    <User className="w-5 h-5 text-muted-foreground/70 shrink-0" />
                    <input
                      type="text"
                      placeholder="admin"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                      className="flex-1 bg-transparent border-none text-foreground font-medium text-base placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pl-1">
                    <label className="block text-sm font-bold text-foreground/80">
                      Contraseña
                    </label>
                  </div>
                  <div className={cn(
                    'flex items-center gap-3 px-4 h-14 rounded-2xl border border-border/60 bg-background/50 transition-all duration-300',
                    'hover:border-border hover:bg-background/80',
                    'focus-within:!border-primary focus-within:!bg-background focus-within:ring-4 focus-within:ring-primary/10',
                  )}>
                    <Lock className="w-5 h-5 text-muted-foreground/70 shrink-0" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="flex-1 bg-transparent border-none text-foreground font-medium text-base placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground/70 hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/50"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-3 px-4 py-3.5 mt-2 rounded-2xl bg-danger/10 border border-danger/20 text-danger">
                        <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0 shadow-[0_0_8px_rgba(var(--danger),0.8)]" />
                        <p className="text-sm font-semibold">{error}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    'w-full h-14 mt-4 rounded-2xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group',
                    'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_20px_-4px_hsl(var(--primary))]',
                    'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-primary',
                    'active:scale-[0.98]',
                  )}
                >
                  {loading ? (
                    <>
                      <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <span className="relative z-10 flex items-center gap-2">
                        Iniciar Sesión
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </>
                  )}
                </button>

                <div className="pt-6 mt-6 border-t border-border/40 text-center">
                  <p className="text-xs font-medium text-muted-foreground/70 mb-2 uppercase tracking-wider">
                    Acceso de demostración
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-sm font-mono font-bold text-foreground/80 border border-border/50">
                    <span>admin</span>
                    <span className="text-muted-foreground/40">/</span>
                    <span>admin123</span>
                  </div>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key="select-store"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl font-bold mb-6 text-foreground">Selecciona tu Tienda</h3>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {stores.map(store => (
                      <button
                        key={store.id}
                        onClick={() => handleSelectStore(store.id)}
                        disabled={loading}
                        className={cn(
                          'w-full flex items-center gap-4 p-4 rounded-2xl border border-border/60 bg-background/50 text-left transition-all duration-300 group',
                          'hover:border-primary/40 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/5',
                          'active:scale-[0.98]',
                          loading && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <Store className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground truncate">{store.name}</p>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                            {store.role}
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="w-4 h-4 text-success" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => { setStep('login'); setPassword(''); setError(''); }}
                  className="w-full h-14 rounded-2xl font-bold text-sm border border-border/60 bg-background/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-[0.98]"
                >
                  Volver al login
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer inside card */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/40">
            <p className="text-xs font-medium text-muted-foreground/60">
              © 2026 POS Pro
            </p>
            <button
              onClick={toggleDark}
              className="p-2.5 rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-95"
              aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;

