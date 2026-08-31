'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Spinner from '@/components/Spinner';
import { Icon } from '@/components/Icons';
import { useI18n } from '@/lib/i18n/context';
import { fmtPrice, fmtDate, daysLeft } from '@/lib/format';

function CheckoutInner() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const plan = search.get('plan') === 'yearly' ? 'yearly' : 'monthly';

  const [me, setMe] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<any | null>(null);
  const [card, setCard] = useState({ number: '4242 4242 4242 4242', name: 'DEMO USER', expiry: '12/28', cvc: '123' });

  useEffect(() => {
    Promise.all([
      fetch('/api/plans').then((r) => r.json()),
      fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([p, m]) => {
      setPlans(p);
      if (!m?.user) {
        const next = encodeURIComponent(`/checkout?plan=${plan}`);
        router.replace(`/login?next=${next}`);
        return;
      }
      setMe(m);
      setLoading(false);
    });
  }, [router, plan]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Icon name="check" className="h-10 w-10" />
        </span>
        <h1 className="mt-6 text-2xl font-extrabold text-slate-900">{t('checkout_success_title')}</h1>
        <p className="mt-3 text-slate-500">{t('checkout_success_desc')}</p>
        <p className="mt-4 rounded-xl bg-indigo-50 p-4 text-sm font-semibold text-indigo-700">
          {t('dash_ends')}: {fmtDate(done.ends_at, lang)}
        </p>
        <Link href="/dashboard" className="btn-primary mt-8 w-full">
          {t('checkout_go_dashboard')}
        </Link>
      </div>
    );
  }

  const price = plans ? (plan === 'monthly' ? plans.monthly : plans.yearly) : 0;
  const cur = me?.sub;

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok || !d.ok) return;
    setDone(d.sub);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-extrabold text-slate-900">
        {cur ? t('checkout_renew_title') : t('checkout_title')}
      </h1>

      <div className="mt-8 grid gap-6 md:grid-cols-5">
        {/* Summary */}
        <div className="md:col-span-2">
          <div className="card p-6">
            <h2 className="font-bold text-slate-900">{t('checkout_summary')}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">{t('checkout_plan')}</dt>
                <dd className="font-bold text-slate-900">{t(`plan_${plan}`)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <dt className="text-slate-500">{t('checkout_price')}</dt>
                <dd className="text-lg font-extrabold text-indigo-700" dir="ltr">
                  {fmtPrice(price, lang)}
                </dd>
              </div>
            </dl>
            {cur && (
              <p className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-700">
                {t('checkout_current_end')} {fmtDate(cur.ends_at, lang)} ({daysLeft(cur.ends_at)}{' '}
                {t('dash_days_left_unit')}) — {t('checkout_ext_note')}
              </p>
            )}
            <p className="mt-4 rounded-xl bg-indigo-50 p-3 text-xs leading-5 text-indigo-700">
              <Icon name="shield" className="me-1 inline h-3.5 w-3.5" />
              {t('checkout_mock_warning')}
            </p>
          </div>
        </div>

        {/* Card form */}
        <div className="md:col-span-3">
          <form onSubmit={pay} className="card p-6">
            <h2 className="flex items-center gap-2 font-bold text-slate-900">
              <Icon name="card" className="h-5 w-5 text-indigo-600" />
              {t('checkout_card_title')}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">{t('checkout_card_number')}</label>
                <input
                  className="input"
                  dir="ltr"
                  value={card.number}
                  onChange={(e) => setCard({ ...card, number: e.target.value })}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">{t('checkout_card_name')}</label>
                <input
                  className="input"
                  dir="ltr"
                  value={card.name}
                  onChange={(e) => setCard({ ...card, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">{t('checkout_expiry')}</label>
                <input
                  className="input"
                  dir="ltr"
                  value={card.expiry}
                  onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                  required
                  placeholder="MM/YY"
                />
              </div>
              <div>
                <label className="label">{t('checkout_cvc')}</label>
                <input
                  className="input"
                  dir="ltr"
                  value={card.cvc}
                  onChange={(e) => setCard({ ...card, cvc: e.target.value })}
                  required
                  placeholder="123"
                />
              </div>
            </div>
            <button type="submit" disabled={busy} className="btn-primary mt-6 w-full !py-3.5 !text-base">
              {busy ? (
                <>
                  <Spinner className="h-4 w-4 !border-white/40 !border-t-white" />
                  {t('checkout_paying')}
                </>
              ) : (
                <>
                  {t('checkout_pay')} — <span dir="ltr">{fmtPrice(price, lang)}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function Checkout() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      }
    >
      <CheckoutInner />
    </Suspense>
  );
}
