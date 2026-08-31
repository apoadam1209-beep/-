import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { q, run } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = requireAdmin();
  if ('status' in guard) {
    return NextResponse.json({ ok: false }, { status: guard.status });
  }
  const monthlyPrice = Number(q<{ value: string }>("SELECT value FROM settings WHERE key = 'monthly_price'")?.value || 150);
  const yearlyPrice = Number(q<{ value: string }>("SELECT value FROM settings WHERE key = 'yearly_price'")?.value || 1200);
  return NextResponse.json({ ok: true, monthlyPrice, yearlyPrice, currency: 'EGP' });
}

export async function PUT(req: Request) {
  const guard = requireAdmin();
  if ('status' in guard) {
    return NextResponse.json({ ok: false }, { status: guard.status });
  }
  try {
    const body = await req.json();
    const monthlyPrice = Math.max(0, Number(body.monthlyPrice) || 0);
    const yearlyPrice = Math.max(0, Number(body.yearlyPrice) || 0);
    run("INSERT INTO settings (key, value) VALUES ('monthly_price', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", String(monthlyPrice));
    run("INSERT INTO settings (key, value) VALUES ('yearly_price', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", String(yearlyPrice));
    return NextResponse.json({ ok: true, monthlyPrice, yearlyPrice });
  } catch {
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 });
  }
}
