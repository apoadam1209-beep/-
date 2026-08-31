import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { createSession, publicUser, verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    const user = q<any>('SELECT * FROM users WHERE email = ?', email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ ok: false, error: 'invalid' }, { status: 401 });
    }

    const token = createSession(user.id);
    const res = NextResponse.json({ ok: true, user: publicUser(user) });
    res.cookies.set('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 3600,
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 });
  }
}
