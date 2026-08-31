'use client';

import { useEffect, useState } from 'react';
import Spinner from '@/components/Spinner';
import { Icon } from '@/components/Icons';
import { useI18n } from '@/lib/i18n/context';

export default function AdminSettings() {
  const { t } = useI18n();
  const [monthly, setMonthly] = useState('');
  const [yearly, setYearly] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        setMonthly(String(d.monthlyPrice));
        setYearly(String(d.yearlyPrice));
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyPrice: Number(monthly), yearlyPrice: Number(yearly) }),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-extrabold text-slate-900">{t('set_title')}</h2>
      <p className="mt-1 text-sm text-slate-500">{t('set_sub')}</p>

      <form onSubmit={save} className="card mt-5 space-y-5 p-6">
        <div>
          <label className="label">{t('set_monthly')}</label>
          <input
            type="number"
            min="0"
            className="input"
            dir="ltr"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">{t('set_yearly')}</label>
          <input
            type="number"
            min="0"
            className="input"
            dir="ltr"
            value={yearly}
            onChange={(e) => setYearly(e.target.value)}
            required
          />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? t('loading') : t('save')}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
              <Icon name="check" className="h-4 w-4" />
              {t('set_saved')}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
