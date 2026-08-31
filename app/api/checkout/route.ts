import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createSubscription, subStatus, type Plan } from '@/lib/subs';

export const dynamic = 'force-dynamic';

/**
 * Mock payment endpoint: creates (or extends) a subscription for the
 * authenticated user. No real money moves.
 */
export async function POST(req: Request) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: 'auth' }, { status: 401 });

  let plan: Plan;
  try {
    const body = await req.json();
    plan = body.plan === 'yearly' ? 'yearly' : 'monthly';
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  }

  // simulate payment processing latency
  await new Promise((r) => setTimeout(r, 800));

  try {
    const sub = createSubscription(user.id, plan);
    return NextResponse.json({ ok: true, sub: { ...sub, status: subStatus(sub) } });
  } catch {
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 });
  }
}
