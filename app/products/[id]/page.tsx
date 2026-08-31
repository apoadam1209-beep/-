'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import Spinner from '@/components/Spinner';
import { Icon, categoryGradient, categoryIcon } from '@/components/Icons';
import { useI18n } from '@/lib/i18n/context';

export default function ProductDetail() {
  const { t, lang } = useI18n();
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<any | null | undefined>(undefined);
  const [others, setOthers] = useState<any[]>([]);
  const [me, setMe] = useState<any | null>(null);
  const [hasSub, setHasSub] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/products/${params.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setProduct(d?.product ?? null))
      .catch(() => setProduct(null));
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => setOthers(d.products));
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setMe(d?.user ?? null);
        setHasSub(!!d?.sub);
      });
  }, [params.id]);

  if (product === undefined) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="flex flex-col items-center py-28 text-center">
        <p className="text-2xl font-extrabold text-slate-900">{t('product_not_found')}</p>
        <Link href="/#products" className="btn-primary mt-6">
          {t('nav_products')}
        </Link>
      </div>
    );
  }

  const name = lang === 'ar' ? product.name_ar : product.name_en;
  const desc = lang === 'ar' ? product.desc_ar : product.desc_en;
  const related = others.filter((p) => p.id !== product.id).slice(0, 3);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
      <div className="grid gap-8 md:grid-cols-5">
        <div className="md:col-span-2">
          <div
            className={`flex h-64 items-center justify-center rounded-3xl bg-gradient-to-br md:h-80 ${
              categoryGradient[product.category] || categoryGradient.other
            }`}
          >
            <Icon name={categoryIcon[product.category] || 'box'} className="h-24 w-24 text-white/90" />
          </div>
        </div>
        <div className="md:col-span-3">
          <span className="badge bg-slate-100 text-slate-600">{t(`cat_${product.category}`)}</span>
          <h1 className="mt-4 text-3xl font-extrabold text-slate-900">{name}</h1>
          <p className="mt-4 leading-8 text-slate-600">{desc}</p>

          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="card p-4">
              <dt className="font-medium text-slate-400">{t('product_file')}</dt>
              <dd className="mt-1 font-bold text-slate-800" dir="ltr">
                {product.filename}
              </dd>
            </div>
            <div className="card p-4">
              <dt className="font-medium text-slate-400">{t('cat_' + product.category)}</dt>
              <dd className="mt-1 inline-flex items-center gap-1.5 font-bold text-emerald-600">
                <Icon name="check" className="h-4 w-4" />
                {t('product_included')}
              </dd>
            </div>
          </dl>

          <div className="mt-8">
            {hasSub ? (
              <a href={`/api/download/${product.id}`} className="btn-primary w-full !py-3.5 !text-base">
                <Icon name="download" className="h-5 w-5" />
                {t('product_download')}
              </a>
            ) : (
              <Link href={me ? '/pricing' : '/login?next=' + encodeURIComponent(`/products/${product.id}`)} className="btn-primary w-full !py-3.5 !text-base">
                <Icon name="crown" className="h-5 w-5" />
                {t('product_need_sub')}
              </Link>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="mb-6 text-xl font-extrabold text-slate-900">{t('home_products_title')}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
