import { NextResponse } from 'next/server';
import { getSessionUser, publicUser } from '@/lib/auth';
import { currentSub, subStatus } from '@/lib/subs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const sub = currentSub(user.id);
  return NextResponse.json({
    ok: true,
    user: publicUser(user),
    sub: sub ? { ...sub, status: subStatus(sub) } : null,
  });
}
