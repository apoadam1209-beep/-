'use client';

import { useEffect, useState } from 'react';
import PlanCard from '@/components/PlanCard';
import Spinner from '@/components/Spinner';
import { useI18n } from '@/lib/i18n/context';

export default function Pricing() {
  const { t } = useI18n();
  const [plans, setPlans] = useState<any | null>(null);
  const [me, setMe] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/plans')
      .then((r) => r.json())
      .then(setPlans);
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d?.user ?? null));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 md:py-20">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold text-slate-900 md:text-4xl">{t('pricing_title')}</h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-500">{t('pricing_sub')}</p>
      </div>
      {!plans ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <PlanCard plan="monthly" price={plans.monthly} me={me} />
          <PlanCard plan="yearly" price={plans.yearly} highlighted me={me} />
        </div>
      )}
      <p className="mt-6 text-center text-sm text-slate-500">{t('pricing_current_note')}</p>
      <p className="mt-2 text-center text-xs text-slate-400">{t('pricing_mock_note')}</p>
    </div>
  );
}
