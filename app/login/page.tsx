'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Spinner from '@/components/Spinner';
import { useI18n } from '@/lib/i18n/context';

function LoginInner() {
  const { t } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => {
      if (r.ok && !next) router.replace('/dashboard');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok || !d.ok) {
      setError(t(d.error === 'email_exists' ? 'err_email_exists' : 'err_invalid'));
      return;
    }
    const dest = next || (d.user.role === 'admin' ? '/admin' : '/dashboard');
    router.push(dest);
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-8">
        <h1 className="text-2xl font-extrabold text-slate-900">{t('login_title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('login_sub')}</p>

        <form onSubmit={submit} className="mt-7 space-y-4">
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
          {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? t('loading') : t('login_btn')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {t('no_account')}{' '}
          <Link href="/register" className="font-bold text-indigo-600 hover:underline">
            {t('nav_register')}
          </Link>
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-5 text-sm">
        <p className="font-bold text-indigo-800">{t('demo_title')}</p>
        <ul className="mt-2 space-y-1 text-slate-600" dir="ltr">
          <li>
            {t('demo_user_label')} <code className="font-bold">demo@user.com</code> /{' '}
            <code className="font-bold">Demo@123</code>
          </li>
          <li>
            {t('demo_admin_label')} <code className="font-bold">admin@demo.com</code> /{' '}
            <code className="font-bold">Admin@123</code>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
