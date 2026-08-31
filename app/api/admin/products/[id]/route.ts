import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { q, run } from '@/lib/db';

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

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const guard = requireAdmin();
  if ('status' in guard) {
    return NextResponse.json({ ok: false }, { status: guard.status });
  }

  const id = Number(params.id);
  const existing = q<any>('SELECT * FROM products WHERE id = ?', id);
  if (!existing) return NextResponse.json({ ok: false }, { status: 404 });

  try {
    const form = await req.formData();
    const name_ar = String(form.get('name_ar') || existing.name_ar).trim();
    const name_en = String(form.get('name_en') || existing.name_en).trim();
    const desc_ar = String(form.get('desc_ar') || '').trim();
    const desc_en = String(form.get('desc_en') || '').trim();
    const category = String(form.get('category') || existing.category);
    const featured = form.get('featured') ? 1 : 0;
    const file = form.get('file');

    let content = typeof existing.content === 'string' ? existing.content : '';
    let filename = existing.filename;
    let mime = existing.mime;

    if (file instanceof File) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ ok: false, error: 'file_too_large' }, { status: 400 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      content = new TextDecoder('utf-8', { fatal: false }).decode(buf);
      filename = file.name || filename;
      mime = mimeFor(filename);
    } else {
      const text = form.get('content');
      if (text != null) content = String(text);
      const fname = String(form.get('filename') || '').trim();
      if (fname && fname !== existing.filename) {
        filename = fname;
        mime = mimeFor(fname);
      }
    }

    run(
      `UPDATE products SET name_ar=?, name_en=?, desc_ar=?, desc_en=?, category=?,
       filename=?, mime=?, content=?, featured=? WHERE id=?`,
      name_ar,
      name_en,
      desc_ar,
      desc_en,
      category,
      filename,
      mime,
      content,
      featured,
      id
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = requireAdmin();
  if ('status' in guard) {
    return NextResponse.json({ ok: false }, { status: guard.status });
  }
  const id = Number(params.id);
  run('DELETE FROM downloads WHERE product_id = ?', id);
  run('DELETE FROM products WHERE id = ?', id);
  return NextResponse.json({ ok: true });
}
