import { NextResponse } from 'next/server';
import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const product = q(
    `SELECT id, name_ar, name_en, desc_ar, desc_en, category, filename, mime, featured, created_at
     FROM products WHERE id = ?`,
    Number(params.id)
  );
  if (!product) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true, product });
}
