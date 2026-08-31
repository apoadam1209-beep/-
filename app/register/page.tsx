'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';

export default function Register() {
  const { t } = useI18n();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return setError(t('err_password_short'));
    if (password !== confirm) return setError(t('err_password_mismatch'));
    setBusy(true);
    setError('');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok || !d.ok) {
      setError(t(d.error === 'email_exists' ? 'err_email_exists' : 'err_invalid_fields'));
      return;
    }
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-8">
        <h1 className="text-2xl font-extrabold text-slate-900">{t('register_title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('register_sub')}</p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <div>
            <label className="label">{t('name')}</label>
            <input
              type="text"
              required
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('name')}
            />
          </div>
          <div>
            <label className="label">{t('email')}</label>
            <input
              type="email"
              required
              className="input"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="label">{t('password')}</label>
            <input
              type="password"
              required
              className="input"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="label">{t('confirm_password')}</label>
            <input
              type="password"
              required
              className="input"
              dir="ltr"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? t('loading') : t('register_btn')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {t('have_account')}{' '}
          <Link href="/login" className="font-bold text-indigo-600 hover:underline">
            {t('nav_login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
