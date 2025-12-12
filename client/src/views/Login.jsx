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
    const login = useAppStore(state => state.login);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await api('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            if (res.token) {
                login(res.user, res.token);
                navigate('/ventas');
            } else {
                setError('Credenciales inválidas');
            }
        } catch (e) {
            setError(e.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-muted)] relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--primary)] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse delay-1000"></div>

            <div className="w-full max-w-md p-8 bg-[var(--card)] rounded-2xl shadow-xl border border-[var(--border)] relative z-10 animate-fade-in">
                <div className="text-center mb-8">
                    <div className="h-16 w-16 bg-[var(--primary)] text-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl font-bold shadow-lg transform rotate-3">
                        <Store className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--foreground)]">Punto de Venta</h1>
                    <p className="text-[var(--muted-foreground)] mt-2">Ingresa a tu cuenta para continuar</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        icon={User}
                        placeholder="Usuario o Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoFocus
                    />
                    <Input
                        type="password"
                        icon={Lock}
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 text-center">
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full h-11 text-base shadow-lg hover:translate-y-[-1px] transition-all" isLoading={loading}>
                        Iniciar Sesión
                    </Button>
                </form>

                <div className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
                    &copy; {new Date().getFullYear()} Sistema POS. Todos los derechos reservados.
                </div>
            </div>
        </div>
    );
};

export default Login;
