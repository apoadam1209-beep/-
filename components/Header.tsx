'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import { Icon } from './Icons';

export default function Header() {
  const { t, lang, setLang } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.user ?? null))
      .finally(() => setLoaded(true));
  }, [pathname]);

  useEffect(() => setOpen(false), [pathname]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
    router.refresh();
  };

  const links: { href: string; label: string; show: boolean }[] = [
    { href: '/', label: t('nav_home'), show: true },
    { href: '/#products', label: t('nav_products'), show: true },
    { href: '/pricing', label: t('nav_pricing'), show: true },
    { href: '/dashboard', label: t('nav_dashboard'), show: !!user },
    { href: '/admin', label: t('nav_admin'), show: user?.role === 'admin' },
  ];

  const isActive = (href: string) => {
    const path = href.split('?')[0].split('#')[0];
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(path + '/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-lg font-extrabold text-white">
            C
          </span>
          <span className="leading-tight">
            <span className="block text-base font-extrabold text-slate-900">{t('brand')}</span>
            <span className="block text-[11px] font-medium text-slate-500">{t('brand_tagline')}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.filter((l) => l.show).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                isActive(l.href)
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
            title={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
          >
            <Icon name="globe" className="h-4 w-4" />
            {lang === 'ar' ? 'EN' : 'عربي'}
          </button>

          {loaded &&
            (user ? (
              <div className="hidden items-center gap-2 md:flex">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    {user.name.slice(0, 1)}
                  </span>
                  <span className="max-w-[120px] truncate">{user.name}</span>
                </Link>
                <button onClick={logout} className="btn-ghost !px-3" title={t('nav_logout')}>
                  <Icon name="logout" className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Link href="/login" className="btn-ghost !py-1.5">
                  {t('nav_login')}
                </Link>
                <Link href="/register" className="btn-primary !px-4 !py-2">
                  {t('nav_register')}
                </Link>
              </div>
            ))}

          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="menu"
          >
            <Icon name={open ? 'x' : 'menu'} className="h-5 w-5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links
              .filter((l) => l.show)
              .map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${
                    isActive(l.href) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            {user ? (
              <button onClick={logout} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-rose-600">
                <Icon name="logout" className="h-4 w-4" />
                {t('nav_logout')}
              </button>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600">
                  {t('nav_login')}
                </Link>
                <Link href="/register" className="btn-primary mt-1 w-full">
                  {t('nav_register')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
