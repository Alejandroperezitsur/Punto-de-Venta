import React, { useState } from 'react';
import { useUserStore } from '../store/userStore';
import { api } from '../lib/api';
import { User, Lock, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState('login');
    const [stores, setStores] = useState([]);
    const [tempToken, setTempToken] = useState(null);
    const login = useUserStore(state => state.login);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await api('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username: email, password })
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
        <div className="login-container">
            <div className="login-blob-1"></div>
            <div className="login-blob-2"></div>
            <div className="login-blob-3"></div>

            <div className="login-card">
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div className="login-logo">
                        <Store />
                    </div>
                    <h1 className="login-title">Punto de Venta</h1>
                    <p className="login-subtitle">Sistema Profesional de Gestión</p>
                </div>

                {step === 'login' ? (
                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="login-input-group">
                            <div className="login-input">
                                <User size={20} style={{ color: '#64748b', marginRight: '0.75rem', flexShrink: 0 }} />
                                <input
                                    type="text"
                                    placeholder="Usuario"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoFocus
                                    style={{
                                        flex: 1,
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#f1f5f9',
                                        outline: 'none',
                                        fontSize: '1rem',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                        </div>

                        <div className="login-input-group">
                            <div className="login-input">
                                <Lock size={20} style={{ color: '#64748b', marginRight: '0.75rem', flexShrink: 0 }} />
                                <input
                                    type="password"
                                    placeholder="Contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{
                                        flex: 1,
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#f1f5f9',
                                        outline: 'none',
                                        fontSize: '1rem',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="login-error">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="login-button"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="login-spinner"></div>
                                    Iniciando...
                                </>
                            ) : (
                                'Iniciar Sesión'
                            )}
                        </button>
                    </form>
                ) : (
                    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                        <h3 style={{
                            textAlign: 'center',
                            fontWeight: 600,
                            fontSize: '1.125rem',
                            color: '#f1f5f9',
                            marginBottom: '1.5rem'
                        }}>
                            Selecciona una Tienda
                        </h3>
                        <div className="login-stores">
                            {stores.map(store => (
                                <button
                                    key={store.id}
                                    onClick={() => handleSelectStore(store.id)}
                                    disabled={loading}
                                    className="login-store-item"
                                    style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                        <div className="login-store-icon">
                                            <Store size={20} />
                                        </div>
                                        <div className="login-store-info">
                                            <div className="login-store-name">{store.name}</div>
                                            <div className="login-store-role">{store.role}</div>
                                        </div>
                                    </div>
                                    <div className="login-store-status"></div>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => {
                                setStep('login');
                                setPassword('');
                                setError('');
                            }}
                            className="login-button"
                            style={{ marginTop: '1.5rem' }}
                        >
                            Volver a Inicio de Sesión
                        </button>
                    </div>
                )}

                <div className="login-footer">
                    © 2026 Punto de Venta. Todos los derechos reservados.
                </div>
            </div>
        </div>
    );
};

export default Login;
