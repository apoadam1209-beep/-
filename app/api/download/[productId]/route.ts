import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { q, run } from '@/lib/db';
import { currentSub } from '@/lib/subs';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { productId: string } }) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: 'auth' }, { status: 401 });

  const sub = currentSub(user.id);
  if (!sub) {
    return NextResponse.json({ ok: false, error: 'no_sub' }, { status: 403 });
  }

  const product = q<any>('SELECT * FROM products WHERE id = ?', Number(params.productId));
  if (!product) return NextResponse.json({ ok: false }, { status: 404 });

  run(
    'INSERT INTO downloads (product_id, user_id, created_at) VALUES (?,?,?)',
    product.id,
    user.id,
    new Date().toISOString()
  );

  const buf = Buffer.from(product.content ?? '', 'utf8');
  return new NextResponse(buf, {
    headers: {
      'Content-Type': product.mime || 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(product.filename)}`,
      'Content-Length': String(buf.length),
    },
  });
}
