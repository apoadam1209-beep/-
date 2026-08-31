import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { qa, run } from '@/lib/db';

export const dynamic = 'force-dynamic';

const MIME_BY_EXT: Record<string, string> = {
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function mimeFor(filename: string) {
  const ext = '.' + (filename.split('.').pop() || 'txt').toLowerCase();
  return MIME_BY_EXT[ext] || 'application/octet-stream';
}

function listProducts() {
  return qa<any>('SELECT * FROM products ORDER BY featured DESC, id DESC').map((p) => ({
    ...p,
    contentText: typeof p.content === 'string' ? p.content : null,
    content: undefined,
  }));
}

export async function GET() {
  const guard = requireAdmin();
  if ('status' in guard) {
    return NextResponse.json({ ok: false }, { status: guard.status });
  }
  return NextResponse.json({ ok: true, products: listProducts() });
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const guard = requireAdmin();
  if ('status' in guard) {
    return NextResponse.json({ ok: false }, { status: guard.status });
  }

  try {
    const form = await req.formData();
    const name_ar = String(form.get('name_ar') || '').trim();
    const name_en = String(form.get('name_en') || '').trim();
    if (!name_ar || !name_en) {
      return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
    }

    const desc_ar = String(form.get('desc_ar') || '').trim();
    const desc_en = String(form.get('desc_en') || '').trim();
    const category = String(form.get('category') || 'other');
    const featured = form.get('featured') ? 1 : 0;
    const file = form.get('file');

    let content = String(form.get('content') || '');
    let filename = String(form.get('filename') || '').trim() || 'product.txt';

    if (file instanceof File) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ ok: false, error: 'file_too_large' }, { status: 400 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      content = new TextDecoder('utf-8', { fatal: false }).decode(buf);
      filename = file.name || filename;
    }

    const info = run(
      `INSERT INTO products (name_ar, name_en, desc_ar, desc_en, category, filename, mime, content, featured, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      name_ar,
      name_en,
      desc_ar,
      desc_en,
      category,
      filename,
      mimeFor(filename),
      content,
      featured,
      new Date().toISOString()
    );
    return NextResponse.json({ ok: true, id: Number(info.lastInsertRowid) });
  } catch {
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 });
  }
}
