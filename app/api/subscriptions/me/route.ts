import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { currentSub, historySubs, subStatus } from '@/lib/subs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const cur = currentSub(user.id);
  const history = historySubs(user.id).map((s) => ({ ...s, status: subStatus(s) }));
  return NextResponse.json({
    ok: true,
    current: cur ? { ...cur, status: subStatus(cur) } : null,
    history,
  });
}
