'use client';

import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import { fmtPrice } from '@/lib/format';
import { Icon } from './Icons';

export default function PlanCard({
  plan,
  price,
  highlighted = false,
  me,
}: {
  plan: 'monthly' | 'yearly';
  price: number;
  highlighted?: boolean;
  me: any | null;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();

  const choose = () => {
    const next = `/checkout?plan=${plan}`;
    if (!me) router.push(`/login?next=${encodeURIComponent(next)}`);
    else router.push(next);
  };

  const features = ['pricing_f1', 'pricing_f2', 'pricing_f3', 'pricing_f4', 'pricing_f5'];

  return (
    <div
      className={`card relative flex flex-col p-7 ${
        highlighted ? 'border-transparent ring-2 ring-indigo-600' : ''
      }`}
    >
      {highlighted && (
        <span className="badge absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 px-3 text-white">
          {t('save_33')}
        </span>
      )}
      <h3 className="text-lg font-extrabold text-slate-900">{t(`plan_${plan}`)}</h3>
      <div className="mt-4 flex items-baseline gap-1.5" dir="ltr">
        <span className="text-4xl font-extrabold tracking-tight text-slate-900">
          {fmtPrice(price, lang)}
        </span>
        <span className="text-sm font-medium text-slate-500">
          {t(plan === 'monthly' ? 'per_month' : 'per_year')}
        </span>
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Icon name="check" className="h-3 w-3" />
            </span>
            {t(f)}
          </li>
        ))}
      </ul>
      <button
        onClick={choose}
        className={`mt-7 w-full ${highlighted ? 'btn-primary' : 'btn-outline'}`}
      >
        {me ? t('choose_current') : t('choose')}
      </button>
    </div>
  );
}
