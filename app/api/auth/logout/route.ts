import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { run } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  const token = cookies().get('session')?.value;
  if (token) run('DELETE FROM sessions WHERE token = ?', token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set('session', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
