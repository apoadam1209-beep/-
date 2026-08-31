'use client';

import { useCallback, useEffect, useState } from 'react';
import Spinner from '@/components/Spinner';
import { Icon } from '@/components/Icons';
import { useI18n } from '@/lib/i18n/context';

const CATEGORIES = ['templates', 'courses', 'ebooks', 'audio', 'files', 'other'];

const emptyForm = {
  name_ar: '',
  name_en: '',
  desc_ar: '',
  desc_en: '',
  category: 'templates',
  filename: '',
  content: '',
  featured: false,
};

export default function AdminProducts() {
  const { t, lang } = useI18n();
  const [products, setProducts] = useState<any[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(() => {
    fetch('/api/admin/products')
      .then((r) => r.json())
      .then((d) => setProducts(d.products));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFile(null);
    setFormOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      name_ar: p.name_ar,
      name_en: p.name_en,
      desc_ar: p.desc_ar,
      desc_en: p.desc_en,
      category: p.category,
      filename: p.filename,
      content: p.contentText ?? '',
      featured: !!p.featured,
    });
    setFile(null);
    setFormOpen(true);
  };

  const remove = async (p: any) => {
    if (!window.confirm(t('p_confirm_delete'))) return;
    await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' });
    setToast(t('p_deleted'));
    load();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData();
    fd.set('name_ar', form.name_ar);
    fd.set('name_en', form.name_en);
    fd.set('desc_ar', form.desc_ar);
    fd.set('desc_en', form.desc_en);
    fd.set('category', form.category);
    fd.set('filename', form.filename);
    fd.set('content', form.content);
    if (form.featured) fd.set('featured', '1');
    if (file) fd.set('file', file);

    const res = await fetch(
      editing ? `/api/admin/products/${editing.id}` : '/api/admin/products',
      { method: editing ? 'PUT' : 'POST', body: fd }
    );
    setBusy(false);
    if (!res.ok) return;
    setFormOpen(false);
    setEditing(null);
    setToast(t('p_saved'));
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold text-slate-900">{t('admin_products')}</h2>
        {!formOpen && (
          <button onClick={openAdd} className="btn-primary">
            <Icon name="plus" className="h-4 w-4" />
            {t('admin_add_product')}
          </button>
        )}
      </div>

      {toast && (
        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {toast}
        </div>
      )}

      {/* Product form */}
      {formOpen && (
        <form onSubmit={submit} className="card mt-5 p-6">
          <h3 className="font-bold text-slate-900">
            {editing ? t('admin_edit_product') : t('admin_add_product')}
          </h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">{t('p_name_ar')}</label>
              <input
                className="input"
                required
                dir="rtl"
                value={form.name_ar}
                onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('p_name_en')}</label>
              <input
                className="input"
                required
                dir="ltr"
                value={form.name_en}
                onChange={(e) => setForm({ ...form, name_en: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('p_desc_ar')}</label>
              <textarea
                className="input min-h-[70px]"
                dir="rtl"
                value={form.desc_ar}
                onChange={(e) => setForm({ ...form, desc_ar: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('p_desc_en')}</label>
              <textarea
                className="input min-h-[70px]"
                dir="ltr"
                value={form.desc_en}
                onChange={(e) => setForm({ ...form, desc_en: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('p_category')}</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`cat_${c}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('p_file')}</label>
              <input
                type="file"
                className="input !py-2 file:me-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-indigo-700"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="mt-1.5 text-xs text-slate-400">{t('p_file_hint')}</p>
            </div>
            <div>
              <label className="label">{t('p_filename')}</label>
              <input
                className="input"
                dir="ltr"
                placeholder="my-product.txt"
                value={form.filename}
                onChange={(e) => setForm({ ...form, filename: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('p_content')}</label>
              <textarea
                className="input min-h-[90px] font-mono text-xs"
                dir="ltr"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>
          </div>
          <label className="mt-4 flex items-center gap-2.5 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-indigo-600"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            />
            {t('p_featured')}
          </label>
          <div className="mt-6 flex gap-3">
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? t('loading') : t('p_save')}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setEditing(null);
                setFile(null);
              }}
              className="btn-outline"
            >
              {t('close')}
            </button>
          </div>
        </form>
      )}

      {/* Products table */}
      {!products ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="card mt-5 overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                <th className="px-5 py-3 text-start font-semibold">{t('u_name')}</th>
                <th className="px-5 py-3 text-start font-semibold">{t('p_category')}</th>
                <th className="px-5 py-3 text-start font-semibold">{t('p_file')}</th>
                <th className="px-5 py-3 text-start font-semibold">⭐</th>
                <th className="px-5 py-3 text-start font-semibold">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p: any) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-800">{lang === 'ar' ? p.name_ar : p.name_en}</p>
                    <p className="text-xs text-slate-400" dir={lang === 'ar' ? 'ltr' : 'rtl'}>
                      {lang === 'ar' ? p.name_en : p.name_ar}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="badge bg-slate-100 text-slate-600">{t(`cat_${p.category}`)}</span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500" dir="ltr">
                    {p.filename}
                  </td>
                  <td className="px-5 py-3.5">
                    {p.featured ? <Icon name="star" className="h-4 w-4 text-amber-500" /> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600"
                        title={t('edit')}
                      >
                        <Icon name="edit" className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(p)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                        title={t('delete')}
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
