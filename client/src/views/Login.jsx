import React, { useState } from 'react';
import { useUserStore } from '../store/userStore';
import { api } from '../lib/api';
import { User, Lock, Store, Eye, EyeOff, Sun, Moon } from 'lucide-react';
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
    <div className="min-h-screen w-full flex bg-background relative overflow-hidden">
      {/* Left side - Branding */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            animate={{ x: [0, 30, -20, 0], y: [0, -30, 20, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(221 83% 53% / 0.15) 0%, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
          <motion.div
            animate={{ x: [0, -20, 30, 0], y: [0, 20, -30, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-[15%] -right-[10%] w-[45%] h-[45%] rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(221 83% 53% / 0.1) 0%, transparent 70%)',
              filter: 'blur(100px)',
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.2 }}
            className="size-24 rounded-3xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-primary/30"
          >
            {branding.logo ? (
              <img src={branding.logo} alt="Logo" className="size-full object-contain p-2" />
            ) : (
              <Store className="size-12 text-white" />
            )}
          </motion.div>
          <h2 className="text-4xl font-black tracking-tight mb-3">{branding.businessName}</h2>
          <p className="text-lg text-muted-foreground font-medium mb-6">
            {branding.businessSubtitle}
          </p>
          <p className="text-sm text-muted-foreground/70 leading-relaxed">
            Gestiona tus ventas, inventario y clientes con una plataforma moderna y confiable. Disponible offline para mayor flexibilidad.
          </p>
        </motion.div>
      </div>

      {/* Right side - Login Form */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12"
      >
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              className="size-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/25"
            >
              {branding.logo ? (
                <img src={branding.logo} alt="Logo" className="size-full object-contain p-1" />
              ) : (
                <Store className="size-8 text-white" />
              )}
            </motion.div>
            <h1 className="text-2xl font-black tracking-tight">{branding.businessName}</h1>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">
              {branding.businessSubtitle}
            </p>
          </div>

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
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Usuario
                  </label>
                  <div className={cn(
                    'flex items-center gap-3 px-4 h-12 rounded-lg bg-surface-hover transition-all duration-200',
                    'focus-within:ring-2 focus-within:ring-primary/50',
                  )}>
                    <User className="size-5 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      placeholder="admin"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                      className="flex-1 bg-transparent border-none text-foreground text-base placeholder:text-muted-foreground/40 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Contraseña
                  </label>
                  <div className={cn(
                    'flex items-center gap-3 px-4 h-12 rounded-lg bg-surface-hover transition-all duration-200',
                    'focus-within:ring-2 focus-within:ring-primary/50',
                  )}>
                    <Lock className="size-5 text-muted-foreground shrink-0" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="flex-1 bg-transparent border-none text-foreground text-base placeholder:text-muted-foreground/40 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                    >
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-danger/10 text-danger"
                    >
                      <span className="size-2 rounded-full bg-danger shrink-0" />
                      <p className="text-sm font-medium">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    'w-full h-12 rounded-lg font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2',
                    'bg-primary text-primary-foreground hover:brightness-110',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'active:scale-[0.98]',
                  )}
                >
                  {loading ? (
                    <>
                      <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </button>

                <div className="pt-2 space-y-2 text-center">
                  <p className="text-xs text-muted-foreground/60">
                    Credenciales de prueba:
                  </p>
                  <p className="text-sm font-mono font-semibold text-foreground">
                    admin / admin123
                  </p>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key="select-store"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-bold mb-4">Selecciona tu Tienda</h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {stores.map(store => (
                      <button
                        key={store.id}
                        onClick={() => handleSelectStore(store.id)}
                        disabled={loading}
                        className={cn(
                          'w-full flex items-center gap-4 p-4 rounded-lg bg-surface-hover text-left transition-all duration-200',
                          'hover:bg-surface-active hover:shadow-md',
                          'active:scale-[0.99]',
                          loading && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        <div className="size-12 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                          <Store className="size-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{store.name}</p>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">
                            {store.role}
                          </p>
                        </div>
                        <span className="size-2 rounded-full bg-success shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => { setStep('login'); setPassword(''); setError(''); }}
                  className="w-full h-12 rounded-lg font-semibold text-sm bg-surface-hover text-muted-foreground hover:text-foreground hover:bg-surface-active transition-all"
                >
                  Volver
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/20">
            <p className="text-xs text-muted-foreground/50">
              © 2026 POS Pro
            </p>
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
              aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
