import { NextResponse } from 'next/server';
import { qa } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const products = qa(
    `SELECT id, name_ar, name_en, desc_ar, desc_en, category, filename, mime, featured, created_at
     FROM products ORDER BY featured DESC, id DESC`
  );
  return NextResponse.json({ ok: true, products });
}
