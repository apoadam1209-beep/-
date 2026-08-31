'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import Spinner from '@/components/Spinner';
import { Icon } from '@/components/Icons';
import { useI18n } from '@/lib/i18n/context';
import { fmtPrice, fmtDate, daysLeft } from '@/lib/format';

export default function Dashboard() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any | null>(null);
  const [history, setHistory] = useState<any[] | null>(null);
  const [products, setProducts] = useState<any[] | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/subscriptions/me').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/products').then((r) => r.json()).catch(() => null),
    ]).then(([m, s, p]) => {
      if (!m?.user) {
        router.replace('/login?next=' + encodeURIComponent('/dashboard'));
        return;
      }
      setMe(m);
      setHistory(s?.history ?? []);
      setProducts(p?.products ?? []);
      setLoading(false);
    });
  }, [router]);

  const cancelSub = async () => {
    if (!window.confirm(t('dash_cancel_confirm'))) return;
    await fetch('/api/subscriptions/cancel', { method: 'POST' });
    const m = await fetch('/api/auth/me').then((r) => r.json());
    setMe(m);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const sub = me?.sub;
  const progress = sub
    ? Math.min(
        100,
        Math.max(
          0,
          ((Date.now() - new Date(sub.started_at).getTime()) /
            (new Date(sub.ends_at).getTime() - new Date(sub.started_at).getTime())) *
            100
        )
      )
    : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900">{t('dash_title')}</h1>
      <p className="mt-2 text-slate-500">
        {t('dash_sub')} — <span className="font-semibold">{me.name}</span>
      </p>

      {/* Subscription card */}
      <div className="mt-8">
        {sub ? (
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-6">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Icon name="crown" className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-medium text-slate-400">{t('dash_plan')}</p>
                  <p className="text-lg font-extrabold text-slate-900">
                    {t(`plan_${sub.plan}`)}{' '}
                    <span className="text-sm font-semibold text-slate-400" dir="ltr">
                      {fmtPrice(sub.price, lang)}
                    </span>
                  </p>
                </div>
              </div>
              <span
                className={`badge ${
                  sub.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {t(`status_${sub.status}`)}
              </span>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-slate-400">{t('dash_started')}</p>
                <p className="mt-1 font-bold text-slate-800">{fmtDate(sub.started_at, lang)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">{t('dash_ends')}</p>
                <p className="mt-1 font-bold text-slate-800">{fmtDate(sub.ends_at, lang)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">{t('dash_days_left')}</p>
                <p className="mt-1 font-extrabold text-indigo-700">
                  {daysLeft(sub.ends_at)} {t('dash_days_left_unit')}
                </p>
              </div>
              <div className="md:col-span-3">
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-indigo-500 to-violet-500"
                    style={{ width: `${100 - progress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-100 p-6">
              <Link href={`/checkout?plan=${sub.plan}`} className="btn-primary">
                <Icon name="zap" className="h-4 w-4" />
                {t('dash_renew')}
              </Link>
              {sub.status === 'active' && (
                <button onClick={cancelSub} className="btn-danger">
                  <Icon name="x" className="h-4 w-4" />
                  {t('dash_cancel')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="card flex flex-col items-center gap-4 p-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Icon name="clock" className="h-7 w-7" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">{t('dash_no_sub_title')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('dash_no_sub_desc')}</p>
            </div>
            <Link href="/pricing" className="btn-primary">
              {t('dash_go_pricing')}
            </Link>
          </div>
        )}
      </div>

      {/* Products */}
      <div className="mt-12">
        <h2 className="text-xl font-extrabold text-slate-900">{t('dash_products_title')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('dash_products_sub')}</p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products?.map((p) => (
            <div key={p.id} className="relative">
              <ProductCard p={p} />
              {sub ? (
                <a
                  href={`/api/download/${p.id}`}
                  className="absolute bottom-4 end-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg transition hover:bg-indigo-700"
                  title={t('dash_download')}
                >
                  <Icon name="download" className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      <div className="mt-12">
        <h2 className="text-xl font-extrabold text-slate-900">{t('dash_history_title')}</h2>
        {history && history.length > 0 ? (
          <div className="card mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-start text-xs text-slate-400">
                  <th className="px-5 py-3 text-start font-semibold">{t('checkout_plan')}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t('checkout_price')}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t('dash_started')}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t('dash_ends')}</th>
                  <th className="px-5 py-3 text-start font-semibold">{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((s: any) => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{t(`plan_${s.plan}`)}</td>
                    <td className="px-5 py-3.5" dir="ltr">
                      {fmtPrice(s.price, lang)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{fmtDate(s.started_at, lang)}</td>
                    <td className="px-5 py-3.5 text-slate-500">{fmtDate(s.ends_at, lang)}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`badge ${
                          s.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : s.status === 'cancelled'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {t(`status_${s.status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400">{t('dash_history_empty')}</p>
        )}
      </div>
    </div>
  );
}
