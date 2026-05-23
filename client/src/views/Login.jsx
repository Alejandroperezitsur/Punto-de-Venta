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
  const login = useUserStore(state => state.login);
  const navigate = useNavigate();
  const { isDark, toggleDark } = useTheme();

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
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 30, -20, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(221 83% 53% / 0.12) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <motion.div
          animate={{ x: [0, -20, 30, 0], y: [0, 20, -30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-[15%] -right-[10%] w-[45%] h-[45%] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(221 83% 53% / 0.08) 0%, transparent 70%)',
            filter: 'blur(100px)',
          }}
        />
        <motion.div
          animate={{ x: [0, 15, -10, 0], y: [0, -10, 15, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[40%] -right-[5%] w-[30%] h-[30%] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(221 83% 53% / 0.06) 0%, transparent 70%)',
            filter: 'blur(120px)',
          }}
        />
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative w-full max-w-[420px] glass-strong rounded-4xl shadow-2xl p-8 md:p-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.1 }}
            className="size-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-primary/25"
          >
            <Store className="size-10 text-white" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-3xl font-black tracking-tight mb-1.5"
          >
            Punto de Venta
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm font-semibold text-muted-foreground uppercase tracking-widest"
          >
            Sistema Profesional de Gestión
          </motion.p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'login' ? (
            <motion.form
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 ml-1">
                  Usuario
                </label>
                <div className={cn(
                  'flex items-center gap-3 px-4 h-14 rounded-2xl border-2 border-input bg-card transition-all duration-200',
                  'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20',
                )}>
                  <User className="size-5 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    placeholder="Ingresa tu usuario"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    className="flex-1 bg-transparent border-none text-foreground font-medium text-base placeholder:text-muted-foreground/50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 ml-1">
                  Contraseña
                </label>
                <div className={cn(
                  'flex items-center gap-3 px-4 h-14 rounded-2xl border-2 border-input bg-card transition-all duration-200',
                  'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20',
                )}>
                  <Lock className="size-5 text-muted-foreground shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 bg-transparent border-none text-foreground font-medium text-base placeholder:text-muted-foreground/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
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
                    initial={{ opacity: 0, y: -5, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -5, height: 0 }}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-danger/10 border border-danger/20"
                  >
                    <span className="size-1.5 rounded-full bg-danger shrink-0" />
                    <p className="text-sm font-semibold text-danger">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full h-14 rounded-2xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2.5',
                  'bg-primary text-primary-foreground hover:brightness-110 shadow-lg shadow-primary/25',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'active:scale-[0.98]',
                )}
              >
                {loading ? (
                  <>
                    <span className="size-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>

              <p className="text-center text-xs text-muted-foreground/60 mt-4">
                Demo: <strong>admin</strong> / <strong>admin123</strong>
              </p>
            </motion.form>
          ) : (
            <motion.div
              key="select-store"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-bold text-center mb-4">Selecciona una Tienda</h3>
              <div className="space-y-3 max-h-[280px] overflow-y-auto">
                {stores.map(store => (
                  <button
                    key={store.id}
                    onClick={() => handleSelectStore(store.id)}
                    disabled={loading}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-input bg-card text-left transition-all duration-200',
                      'hover:border-ring/50 hover:shadow-md active:scale-[0.99]',
                      loading && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Store className="size-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{store.name}</p>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                        {store.role}
                      </p>
                    </div>
                    <span className="size-2.5 rounded-full bg-success shadow-sm shadow-success/50 shrink-0" />
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setStep('login'); setPassword(''); setError(''); }}
                className="w-full h-12 rounded-2xl font-semibold text-sm border-2 border-input text-muted-foreground hover:text-foreground hover:border-ring/50 transition-all"
              >
                Volver
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <p className="text-[11px] text-muted-foreground/50 font-medium">
            © 2026 POS Pro
          </p>
          <button
            onClick={toggleDark}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
            aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
