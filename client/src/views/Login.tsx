import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useUserStore } from '../store/userStore';
import { api } from '../lib/api';
import { Store, LogIn } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useUserStore(s => s.login);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError('');
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      login(data.user, data.token);
      navigate('/ventas');
    } catch (e: any) {
      setError(e.message || t('login.error'));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-bg-app flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="size-12 rounded-xl bg-action-primary flex items-center justify-center mx-auto mb-4">
            <Store className="size-6 text-[var(--bg-surface)]" />
          </div>
          <h1 className="text-[var(--text-heading-lg)] font-bold text-text-primary tracking-tight">{t('login.title')}</h1>
          <p className="text-sm text-text-secondary mt-1">{t('login.subtitle')}</p>
        </div>

        <div className="bg-bg-surface border border-border-subtle rounded-xl p-6 shadow-dialog">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">{t('login.username')}</label>
              <Input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                autoFocus
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-tertiary uppercase tracking-wider">{t('login.password')}</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-danger-bg border border-danger/20 text-danger-text text-xs font-semibold text-center">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" isLoading={loading}>
              <LogIn className="size-4" />
              {t('login.submit')}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-text-tertiary mt-6">
          POS Pro by APV Labs
        </p>
      </div>
    </div>
  );
}
