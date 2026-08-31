import { NextResponse } from 'next/server';
import { q, run } from '@/lib/db';
import { createSession, publicUser, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!name || !email || !password || password.length < 6) {
      return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
    }
    if (q('SELECT id FROM users WHERE email = ?', email)) {
      return NextResponse.json({ ok: false, error: 'email_exists' }, { status: 409 });
    }

    const info = run(
      'INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?,?,?,?,?)',
      name,
      email,
      hashPassword(password),
      'user',
      new Date().toISOString()
    );
    const user = q<any>('SELECT * FROM users WHERE id = ?', Number(info.lastInsertRowid))!;
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
