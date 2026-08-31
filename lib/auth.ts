import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { q, run } from './db';

export interface UserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export function publicUser(u: UserRow) {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

const SESSION_DAYS = 30;

export function createSession(userId: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)', token, userId, expires);
  return token;
}

export function setSessionCookie(res: Response, token: string) {
  const cookiesStore = cookies();
  void cookiesStore;
  res.headers.append(
    'Set-Cookie',
    `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 3600}`
  );
}

export function clearSessionCookie(res: Response) {
  res.headers.append('Set-Cookie', 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

export function getSessionUser(): UserRow | null {
  const token = cookies().get('session')?.value;
  if (!token) return null;
  const row = q<any>(
    `SELECT u.id, u.name, u.email, u.role, u.created_at, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`,
    token
  );
  if (!row) return null;
  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    run('DELETE FROM sessions WHERE token = ?', token);
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
  };
}

export function requireAuth() {
  return getSessionUser();
}

export function requireAdmin() {
  const user = getSessionUser();
  if (!user) return { status: 401 as const };
  if (user.role !== 'admin') return { status: 403 as const };
  return { user };
}

export function hashPassword(pw: string) {
  return bcrypt.hashSync(pw, 10);
}

export function verifyPassword(pw: string, hash: string) {
  return bcrypt.compareSync(pw, hash);
}
