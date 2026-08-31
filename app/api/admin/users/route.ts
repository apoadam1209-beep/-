import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { qa } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = requireAdmin();
  if ('status' in guard) {
    return NextResponse.json({ ok: false }, { status: guard.status });
  }

  const users = qa<any>(
    `SELECT u.id, u.name, u.email, u.role, u.created_at,
            s.plan, s.ends_at, s.cancelled_at,
            (SELECT COALESCE(SUM(s2.price),0) FROM subscriptions s2 WHERE s2.user_id = u.id) AS total_spent
     FROM users u
     LEFT JOIN subscriptions s ON s.id = (
       SELECT s3.id FROM subscriptions s3 WHERE s3.user_id = u.id ORDER BY s3.id DESC LIMIT 1
     )
     ORDER BY u.created_at DESC`
  );

  return NextResponse.json({ ok: true, users });
}
