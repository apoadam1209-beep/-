'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Spinner from '@/components/Spinner';
import { Icon } from '@/components/Icons';
import { useI18n } from '@/lib/i18n/context';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.user) return router.replace('/login?next=' + encodeURIComponent('/admin'));
        if (d.user.role !== 'admin') return router.replace('/');
        setReady(true);
      })
      .catch(() => router.replace('/login?next=' + encodeURIComponent('/admin')));
  }, [router]);

  if (!ready) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const nav = [
    { href: '/admin', label: t('admin_overview'), icon: 'chart' },
    { href: '/admin/products', label: t('admin_products'), icon: 'box' },
    { href: '/admin/users', label: t('admin_users'), icon: 'users' },
    { href: '/admin/settings', label: t('admin_settings'), icon: 'cog' },
  ];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row md:items-start">
      <aside className="w-full shrink-0 md:sticky md:top-24 md:w-56">
        <h1 className="mb-4 px-2 text-lg font-extrabold text-slate-900">{t('admin_title')}</h1>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {nav.map((n) => {
            const active = n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  active ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-white'
                }`}
              >
                <Icon name={n.icon} className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
