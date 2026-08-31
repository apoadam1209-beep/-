'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import PlanCard from '@/components/PlanCard';
import Spinner from '@/components/Spinner';
import { Icon } from '@/components/Icons';
import { useI18n } from '@/lib/i18n/context';

export default function Home() {
  const { t, lang } = useI18n();
  const [products, setProducts] = useState<any[] | null>(null);
  const [plans, setPlans] = useState<any | null>(null);
  const [me, setMe] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => setProducts(d.products));
    fetch('/api/plans')
      .then((r) => r.json())
      .then(setPlans);
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d?.user ?? null));
  }, []);

  const features = [
    { icon: 'zap', title: t('f1_t'), desc: t('f1_d') },
    { icon: 'download', title: t('f2_t'), desc: t('f2_d') },
    { icon: 'sparkles', title: t('f3_t'), desc: t('f3_d') },
    { icon: 'shield', title: t('f4_t'), desc: t('f4_d') },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-slate-50">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[820px] -translate-x-1/2 rounded-full bg-indigo-200/50 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center md:py-28">
          <span className="badge bg-indigo-100 text-indigo-700">
            <Icon name="sparkles" className="h-3.5 w-3.5" />
            {t('hero_badge')}
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl">
            {t('hero_title_1')}{' '}
            <span className="bg-gradient-to-l from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              {t('hero_title_2')}
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
            {t('hero_sub')}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="/#products" className="btn-primary !px-7 !py-3 !text-base">
              {t('hero_cta_browse')}
            </a>
            <Link href="/pricing" className="btn-outline !px-7 !py-3 !text-base">
              {t('hero_cta_pricing')}
            </Link>
          </div>
          <div className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-4">
            {[
              { n: products ? String(products.length) : '…', l: t('hero_stat_products') },
              { n: '120+', l: t('hero_stat_subscribers') },
              { n: '100%', l: t('hero_stat_quality') },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-5">
                <p className="text-2xl font-extrabold text-indigo-700">{s.n}</p>
                <p className="mt-1 text-xs font-medium text-slate-500 md:text-sm">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="mx-auto max-w-7xl px-4 py-16 md:py-20">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900">{t('home_products_title')}</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-500">{t('home_products_sub')}</p>
        </div>
        {!products ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>

      {/* Features */}
      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-extrabold text-slate-900">{t('home_features_title')}</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-500">{t('home_features_sub')}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <div key={i} className="card p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon name={f.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-bold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-4xl px-4 py-16 md:py-20">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900">{t('home_pricing_title')}</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-500">{t('home_pricing_sub')}</p>
        </div>
        {!plans ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <PlanCard plan="monthly" price={plans.monthly} me={me} />
            <PlanCard plan="yearly" price={plans.yearly} highlighted me={me} />
          </div>
        )}
        <p className="mt-6 text-center text-xs text-slate-400">{t('pricing_mock_note')}</p>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-600 to-violet-600 px-6 py-14 text-center text-white md:py-16">
          <div className="pointer-events-none absolute -top-20 -end-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <h2 className="text-3xl font-extrabold">{t('home_cta_title')}</h2>
          <p className="mx-auto mt-3 max-w-xl text-indigo-100">{t('home_cta_desc')}</p>
          <Link
            href="/pricing"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-base font-bold text-indigo-700 transition hover:bg-indigo-50"
          >
            {t('home_cta_btn')}
            <Icon name="arrow" className="h-5 w-5 rtl:-scale-x-100" />
          </Link>
        </div>
      </section>
    </div>
  );
}
