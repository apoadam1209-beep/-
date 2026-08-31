import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/subs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = getSettings();
  return NextResponse.json({
    ok: true,
    monthly: s.monthlyPrice,
    yearly: s.yearlyPrice,
    currency: s.currency,
  });
}
