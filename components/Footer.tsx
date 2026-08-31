'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';

export default function Footer() {
  const { t } = useI18n();
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  return (
    <footer className="mt-20 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-lg font-extrabold text-white">
              C
            </span>
            <span className="text-base font-extrabold text-slate-900">{t('brand')}</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">{t('footer_desc')}</p>
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900">{t('footer_links')}</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
            <li>
              <Link href="/#products" className="hover:text-indigo-600">
                {t('nav_products')}
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-indigo-600">
                {t('nav_pricing')}
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-indigo-600">
                {t('nav_dashboard')}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900">{t('brand_tagline')}</h4>
          <p className="mt-4 text-sm leading-6 text-slate-500">{t('footer_demo')}</p>
        </div>
      </div>
      <div className="border-t border-slate-100 py-5 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {t('brand')} — {t('footer_rights')}
      </div>
    </footer>
  );
}
