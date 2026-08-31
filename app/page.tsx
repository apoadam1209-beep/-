'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import PlanCard from '@/components/PlanCard';
import Spinner from '@/components/Spinner';
import { Icon } from '@/components/Icons';
import { useI18n } from '@/lib/i18n/context';

const CAT_ORDER = [
  'templates',
  'courses',
  'ebooks',
  'audio',
  'music',
  'videos',
  'photos',
  'fonts',
  'design',
  'files',
  'other',
];

export default function Home() {
  const { t, lang } = useI18n();
  const [products, setProducts] = useState<any[] | null>(null);
  const [plans, setPlans] = useState<any | null>(null);
  const [me, setMe] = useState<any | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(null);

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

  const cats = useMemo(
    () => CAT_ORDER.filter((c) => products?.some((p) => p.category === c)),
    [products]
  );

  const filtered = activeCat
    ? (products ?? []).filter((p) => p.category === activeCat)
    : products;

  const chip = (on: boolean) =>
    `shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
      on
        ? 'border-indigo-600 bg-indigo-600 text-white'
        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700'
    }`;

  const features = [
    { icon: 'zap', title: t('f1_t'), desc: t('f1_d') },
    { icon: 'download', title: t('f2_t'), desc: t('f2_d') },
    { icon: 'sparkles', title: t('f3_t'), desc: t('f3_d') },
    { icon: 'shield', title: t('f4_t'), desc: t('f4_d') },
  ];

  const steps = [
    { icon: 'user', title: t('how_s1_t'), desc: t('how_s1_d') },
    { icon: 'crown', title: t('how_s2_t'), desc: t('how_s2_d') },
    { icon: 'download', title: t('how_s3_t'), desc: t('how_s3_d') },
  ];

  const testimonials = [
    { q: t('t1_q'), name: t('t1_n'), role: t('t1_r') },
    { q: t('t2_q'), name: t('t2_n'), role: t('t2_r') },
    { q: t('t3_q'), name: t('t3_n'), role: t('t3_r') },
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

      {/* Products with category filter */}
      <section id="products" className="mx-auto max-w-7xl px-4 py-16 md:py-20">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900">{t('home_products_title')}</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-500">{t('home_products_sub')}</p>
        </div>

        {!products ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-wrap justify-center gap-2">
              <button onClick={() => setActiveCat(null)} className={chip(!activeCat)}>
                {t('home_all')}
              </button>
              {cats.map((c) => (
                <button key={c} onClick={() => setActiveCat(c)} className={chip(activeCat === c)}>
                  {t(`cat_${c}`)}
                </button>
              ))}
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered?.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* How it works */}
      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-extrabold text-slate-900">{t('how_title')}</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-500">{t('how_sub')}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={i} className="card relative p-7">
                <span className="absolute top-6 end-6 text-5xl font-extrabold text-slate-100">
                  {i + 1}
                </span>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                  <Icon name={s.icon} className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-20">
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

      {/* Testimonials */}
      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-extrabold text-slate-900">{t('testi_title')}</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-500">{t('testi_sub')}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((tm, i) => (
              <figure key={i} className="card flex flex-col p-6">
                <div className="flex gap-1 text-amber-400">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Icon key={s} name="star" className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-7 text-slate-600">
                  “{tm.q}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-extrabold text-indigo-700">
                    {tm.name.slice(0, 1)}
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-slate-800">{tm.name}</span>
                    <span className="block text-xs text-slate-400">{tm.role}</span>
                  </span>
                </figcaption>
              </figure>
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
