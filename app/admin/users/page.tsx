'use client';

import { useEffect, useState } from 'react';
import Spinner from '@/components/Spinner';
import { useI18n } from '@/lib/i18n/context';
import { fmtPrice, fmtDate } from '@/lib/format';

export default function AdminUsers() {
  const { t, lang } = useI18n();
  const [users, setUsers] = useState<any[] | null>(null);

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((d) => setUsers(d.users));
  }, []);

  if (!users) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-5 text-lg font-extrabold text-slate-900">{t('admin_users')}</h2>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-400">
              <th className="px-5 py-3 text-start font-semibold">{t('u_name')}</th>
              <th className="px-5 py-3 text-start font-semibold">{t('u_role')}</th>
              <th className="px-5 py-3 text-start font-semibold">{t('u_joined')}</th>
              <th className="px-5 py-3 text-start font-semibold">{t('u_current_sub')}</th>
              <th className="px-5 py-3 text-start font-semibold">{t('u_total_spent')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => {
              const hasActive = u.ends_at && new Date(u.ends_at).getTime() > Date.now();
              return (
                <tr key={u.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-800">{u.name}</p>
                    <p className="text-xs text-slate-400" dir="ltr">
                      {u.email}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`badge ${
                        u.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t(u.role === 'admin' ? 'role_admin' : 'role_user')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{fmtDate(u.created_at, lang)}</td>
                  <td className="px-5 py-3.5">
                    {u.plan ? (
                      <span
                        className={`badge ${
                          hasActive
                            ? u.cancelled_at
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {t(`plan_${u.plan}`)} → {fmtDate(u.ends_at, lang)}
                      </span>
                    ) : (
                      <span className="text-slate-300">{t('sub_none')}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800" dir="ltr">
                    {fmtPrice(u.total_spent, lang)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
