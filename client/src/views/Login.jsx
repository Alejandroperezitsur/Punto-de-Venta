import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { User, Lock, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState('login'); // login | select-store
    const [stores, setStores] = useState([]);
    const [tempToken, setTempToken] = useState(null);
    const login = useAppStore(state => state.login);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await api('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username: email, password }) // Changed email to username to match backend
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
            setError(e.message || 'Error al iniciar sesión');
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
                body: JSON.stringify({ storeId, tempToken })
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
        <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[hsl(var(--primary))] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse delay-1000"></div>

            <div className="w-full max-w-md p-8 bg-[hsl(var(--card))/0.9] backdrop-blur-xl rounded-3xl shadow-2xl border border-[hsl(var(--border))] relative z-10 animate-fade-in ring-1 ring-white/10">
                <div className="text-center mb-8">
                    <div className="h-20 w-20 bg-gradient-to-tr from-[hsl(var(--primary))] to-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-4xl font-bold shadow-xl transform rotate-3 hover:rotate-6 transition-transform duration-300">
                        <Store className="h-10 w-10" />
                    </div>
                    <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] tracking-tight">Punto de Venta</h1>
                    <p className="text-[hsl(var(--muted-foreground))] mt-2 text-sm font-medium">Sistema Profesional de Gestión</p>
                </div>

                {step === 'login' ? (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Input
                                icon={User}
                                placeholder="Usuario"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoFocus
                                className="bg-[hsl(var(--background))] h-12"
                            />
                        </div>
                        <div className="space-y-2">
                            <Input
                                type="password"
                                icon={Lock}
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-[hsl(var(--background))] h-12"
                            />
                        </div>

                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100 text-center font-medium animate-shake">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-semibold shadow-lg shadow-[hsl(var(--primary))/0.2] hover:translate-y-[-2px] transition-all duration-200"
                            isLoading={loading}
                        >
                            Iniciar Sesión
                        </Button>
                    </form>
                ) : (
                    <div className="space-y-4 animate-fade-in">
                        <h3 className="text-center font-semibold text-lg text-[hsl(var(--foreground))]">Selecciona una Tienda</h3>
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                            {stores.map(store => (
                                <button
                                    key={store.id}
                                    onClick={() => handleSelectStore(store.id)}
                                    disabled={loading}
                                    className="w-full p-4 flex items-center justify-between bg-[hsl(var(--background))] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                                            <Store className="h-5 w-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-[hsl(var(--foreground))]">{store.name}</p>
                                            <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase font-bold">{store.role}</p>
                                        </div>
                                    </div>
                                    <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                                </button>
                            ))}
                        </div>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                                setStep('login');
                                setPassword('');
                                setError('');
                            }}
                        >
                            Volver
                        </Button>
                    </div>
                )}

                <div className="mt-8 text-center">
                    <p className="text-xs text-[hsl(var(--muted-foreground))] font-medium">
                        &copy; {new Date().getFullYear()} Sistema POS. Versión SaaS
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
