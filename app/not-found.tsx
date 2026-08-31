'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <p className="text-7xl font-extrabold text-indigo-600">404</p>
      <h1 className="mt-4 text-xl font-bold text-slate-900">
        <span dir="rtl">الصفحة غير موجودة</span> / <span>Page not found</span>
      </h1>
      <Link href="/" className="btn-primary mt-6">
        <span dir="rtl">العودة للرئيسية</span> / <span>Go home</span>
      </Link>
    </div>
  );
}
