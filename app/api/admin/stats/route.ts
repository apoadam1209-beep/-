import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { q, qa } from '@/lib/db';
import { subStatus } from '@/lib/subs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = requireAdmin();
  if ('status' in guard) {
    return NextResponse.json({ ok: false }, { status: guard.status });
  }

  const nowIso = new Date().toISOString();
  const totalUsers = (q<{ c: number }>('SELECT COUNT(*) AS c FROM users'))!.c;
  const activeSubs = (
    q<{ c: number }>('SELECT COUNT(*) AS c FROM subscriptions WHERE ends_at > ?', nowIso)
  )!.c;
  const totalRevenue = (q<{ s: number }>('SELECT COALESCE(SUM(price),0) AS s FROM subscriptions'))!.s;
  const downloads = (q<{ c: number }>('SELECT COUNT(*) AS c FROM downloads'))!.c;

  // revenue by month, last 6 months
  const months: { key: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    const total = (
      q<{ s: number }>(
        `SELECT COALESCE(SUM(price),0) AS s FROM subscriptions WHERE strftime('%Y-%m', created_at) = ?`,
        key
      )
    )!.s;
    months.push({ key, total });
  }

  const recent = qa<any>(
    `SELECT s.id, s.plan, s.price, s.started_at, s.ends_at, s.cancelled_at, s.created_at, u.name, u.email
     FROM subscriptions s JOIN users u ON u.id = s.user_id
     ORDER BY s.created_at DESC, s.id DESC LIMIT 8`
  ).map((s) => ({ ...s, status: subStatus(s as any) }));

  const planBreakdown = {
    monthly: (
      q<{ c: number }>(
        `SELECT COUNT(*) AS c FROM subscriptions
         WHERE ends_at > ? AND plan = 'monthly' AND id IN (
           SELECT MAX(id) FROM subscriptions WHERE ends_at > ? GROUP BY user_id
         )`,
        nowIso,
        nowIso
      )
    )!.c,
    yearly: (
      q<{ c: number }>(
        `SELECT COUNT(*) AS c FROM subscriptions
         WHERE ends_at > ? AND plan = 'yearly' AND id IN (
           SELECT MAX(id) FROM subscriptions WHERE ends_at > ? GROUP BY user_id
         )`,
        nowIso,
        nowIso
      )
    )!.c,
  };

  return NextResponse.json({
    ok: true,
    totalUsers,
    activeSubs,
    totalRevenue,
    downloads,
    monthlyRevenue: months,
    recentSubs: recent,
    planBreakdown,
  });
}
