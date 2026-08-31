'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import { Icon, categoryGradient, categoryIcon } from './Icons';

export interface ProductLite {
  id: number;
  name_ar: string;
  name_en: string;
  desc_ar: string;
  desc_en: string;
  category: string;
  filename: string;
  mime: string;
  featured: number;
}

export default function ProductCard({ p }: { p: ProductLite }) {
  const { t, lang } = useI18n();
  const name = lang === 'ar' ? p.name_ar : p.name_en;
  const desc = lang === 'ar' ? p.desc_ar : p.desc_en;

  return (
    <Link
      href={`/products/${p.id}`}
      className="card group overflow-hidden transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div
        className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${
          categoryGradient[p.category] || categoryGradient.other
        }`}
      >
        <Icon name={categoryIcon[p.category] || 'box'} className="h-14 w-14 text-white/90" />
        {p.featured ? (
          <span className="badge absolute top-3 start-3 bg-white/90 text-amber-600">
            <Icon name="star" className="h-3 w-3" />
            {lang === 'ar' ? 'مميز' : 'Featured'}
          </span>
        ) : null}
      </div>
      <div className="p-5">
        <span className="badge bg-slate-100 text-slate-600">{t(`cat_${p.category}`)}</span>
        <h3 className="mt-3 font-bold text-slate-900 group-hover:text-indigo-700">{name}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-500">{desc}</p>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-600">
            <Icon name="check" className="h-4 w-4" />
            {t('included_in_sub')}
          </span>
          <Icon
            name="download"
            className="h-4 w-4 text-slate-400 transition group-hover:text-indigo-600"
          />
        </div>
      </div>
    </Link>
  );
}
