'use client';

import { useEffect, useState } from 'react';
import Spinner from '@/components/Spinner';
import { Icon } from '@/components/Icons';
import { useI18n } from '@/lib/i18n/context';
import { fmtPrice, fmtDate } from '@/lib/format';

export default function AdminOverview() {
  const { t, lang } = useI18n();
  const [stats, setStats] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const cards = [
    { label: t('stat_revenue'), value: fmtPrice(stats.totalRevenue, lang), icon: 'card', color: 'bg-indigo-50 text-indigo-600' },
    { label: t('stat_active_subs'), value: String(stats.activeSubs), icon: 'crown', color: 'bg-emerald-50 text-emerald-600' },
    { label: t('stat_users'), value: String(stats.totalUsers), icon: 'users', color: 'bg-sky-50 text-sky-600' },
    { label: t('stat_downloads'), value: String(stats.downloads), icon: 'download', color: 'bg-amber-50 text-amber-600' },
  ];

  const maxRev = Math.max(...stats.monthlyRevenue.map((m: any) => m.total), 1);
  const totalActive = stats.planBreakdown.monthly + stats.planBreakdown.yearly || 1;

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{c.label}</p>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${c.color}`}>
                <Icon name={c.icon} className="h-4.5 w-4.5" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-slate-900" dir="ltr">
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="font-bold text-slate-900">{t('admin_revenue_title')}</h2>
          <div className="mt-6 flex h-44 items-end gap-3">
            {stats.monthlyRevenue.map((m: any) => {
              const label = new Date(m.key + '-01').toLocaleDateString(
                lang === 'ar' ? 'ar-EG' : 'en-GB',
                { month: 'short' }
              );
              return (
                <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[11px] font-bold text-slate-500" dir="ltr">
                    {m.total > 0 ? fmtPrice(m.total, lang) : ''}
                  </span>
                  <div
                    className={`w-full rounded-t-lg transition ${
                      m.total > 0 ? 'bg-gradient-to-t from-indigo-600 to-violet-500' : 'bg-slate-100'
                    }`}
                    style={{ height: `${Math.max((m.total / maxRev) * 100, m.total > 0 ? 6 : 2)}%` }}
                  />
                  <span className="text-xs font-medium text-slate-400">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Plan breakdown */}
        <div className="card p-6">
          <h2 className="font-bold text-slate-900">{t('admin_plan_breakdown')}</h2>
          <div className="mt-6 space-y-5">
            {(
              [
                { key: 'monthly', label: t('admin_monthly'), color: 'bg-sky-500' },
                { key: 'yearly', label: t('admin_yearly'), color: 'bg-violet-500' },
              ] as const
            ).map((p) => {
              const n = stats.planBreakdown[p.key];
              const pct = Math.round((n / totalActive) * 100);
              return (
                <div key={p.key}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">{p.label}</span>
                    <span className="font-bold text-slate-900">
                      {n} <span className="text-xs font-medium text-slate-400">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${p.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent subs */}
      <div className="card mt-6 overflow-x-auto">
        <h2 className="border-b border-slate-100 p-5 font-bold text-slate-900">
          {t('admin_recent_title')}
        </h2>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-400">
              <th className="px-5 py-3 text-start font-semibold">{t('u_name')}</th>
              <th className="px-5 py-3 text-start font-semibold">{t('checkout_plan')}</th>
              <th className="px-5 py-3 text-start font-semibold">{t('checkout_price')}</th>
              <th className="px-5 py-3 text-start font-semibold">{t('dash_started')}</th>
              <th className="px-5 py-3 text-start font-semibold">{t('dash_ends')}</th>
              <th className="px-5 py-3 text-start font-semibold">{t('status')}</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentSubs.map((s: any) => (
              <tr key={s.id} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-400" dir="ltr">
                    {s.email}
                  </p>
                </td>
                <td className="px-5 py-3.5 font-semibold text-slate-700">{t(`plan_${s.plan}`)}</td>
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
    </div>
  );
}
