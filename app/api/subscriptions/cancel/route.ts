import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { cancelCurrentSub, subStatus } from '@/lib/subs';

export const dynamic = 'force-dynamic';

export async function POST() {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const sub = cancelCurrentSub(user.id);
  if (!sub) return NextResponse.json({ ok: false, error: 'none' }, { status: 404 });
  return NextResponse.json({ ok: true, sub: { ...sub, status: subStatus(sub) } });
}
