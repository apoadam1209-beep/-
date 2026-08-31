export type Lang = 'ar' | 'en';

export function fmtPrice(n: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

export function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}
