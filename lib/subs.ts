import { q, qa, run } from './db';

export type Plan = 'monthly' | 'yearly';

export interface SubRow {
  id: number;
  user_id: number;
  plan: Plan;
  price: number;
  started_at: string;
  ends_at: string;
  cancelled_at: string | null;
  created_at: string;
}

export function getSettings() {
  const rows = qa<{ key: string; value: string }>('SELECT key, value FROM settings');
  const m: Record<string, string> = {};
  for (const r of rows) m[r.key] = r.value;
  return {
    monthlyPrice: Number(m.monthly_price || 150),
    yearlyPrice: Number(m.yearly_price || 1200),
    currency: 'EGP',
  };
}

export function priceFor(plan: Plan): number {
  const s = getSettings();
  return plan === 'monthly' ? s.monthlyPrice : s.yearlyPrice;
}

export function addPeriod(date: Date, plan: Plan): Date {
  const d = new Date(date.getTime());
  if (plan === 'monthly') d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

/** The subscription that currently grants access (active or cancelled-but-not-expired). */
export function currentSub(userId: number): SubRow | null {
  const nowIso = new Date().toISOString();
  const row = q<SubRow>(
    'SELECT * FROM subscriptions WHERE user_id = ? AND ends_at > ? ORDER BY id DESC LIMIT 1',
    userId,
    nowIso
  );
  return row ?? null;
}

export function subStatus(s: SubRow): 'active' | 'cancelled' | 'expired' {
  if (new Date(s.ends_at).getTime() <= Date.now()) return 'expired';
  return s.cancelled_at ? 'cancelled' : 'active';
}

/**
 * Create a new subscription for the given plan.
 * If the user already has an unexpired subscription, the new period is stacked
 * on top of the remaining time.
 */
export function createSubscription(userId: number, plan: Plan): SubRow {
  const price = priceFor(plan);
  const cur = currentSub(userId);
  const base = cur
    ? new Date(Math.max(new Date(cur.ends_at).getTime(), Date.now()))
    : new Date();
  const ends = addPeriod(base, plan);
  const info = run(
    'INSERT INTO subscriptions (user_id, plan, price, started_at, ends_at, created_at) VALUES (?,?,?,?,?,?)',
    userId,
    plan,
    price,
    base.toISOString(),
    ends.toISOString(),
    new Date().toISOString()
  );
  const sub = q<SubRow>('SELECT * FROM subscriptions WHERE id = ?', Number(info.lastInsertRowid));
  if (!sub) throw new Error('Failed to create subscription');
  return sub;
}

/** Soft-cancel: access stays until the paid period ends. */
export function cancelCurrentSub(userId: number): SubRow | null {
  const cur = currentSub(userId);
  if (!cur) return null;
  if (!cur.cancelled_at) {
    run('UPDATE subscriptions SET cancelled_at = ? WHERE id = ?', new Date().toISOString(), cur.id);
  }
  return q<SubRow>('SELECT * FROM subscriptions WHERE id = ?', cur.id);
}

export function historySubs(userId: number, limit = 10): SubRow[] {
  return qa<SubRow>('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT ?', userId, limit);
}
