import { getProduct } from '../data/products'
import { getCategory } from '../data/categories'
import { formatDate } from './format'

// يولّد ملف SVG تجريبي يحمل معلومات المنتج وهوية المنصة كبديل عن الملف الأصلي
export function generateProductFile(productId: number): void {
  const product = getProduct(productId)
  if (!product) return
  const category = getCategory(product.category)

  const formats = product.formats.join(' / ')
  const date = formatDate(new Date().toISOString())

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#11111d"/>
      <stop offset="1" stop-color="#1b1035"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8b5cf6"/>
      <stop offset="0.55" stop-color="#e879f9"/>
      <stop offset="1" stop-color="#fbbf24"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)"/>
  <circle cx="1050" cy="120" r="220" fill="#8b5cf6" opacity="0.15"/>
  <circle cx="120" cy="700" r="260" fill="#e879f9" opacity="0.12"/>

  <!-- شعار المنصة -->
  <g transform="translate(96, 88)">
    <rect x="0" y="0" width="64" height="64" rx="16" fill="#0b0b14"/>
    <path d="M42 22a16 16 0 1 0 0 24" fill="none" stroke="url(#accent)" stroke-width="7" stroke-linecap="round"/>
    <circle cx="46" cy="34" r="4.5" fill="#fbbf24"/>
    <text x="84" y="44" font-family="Cairo, sans-serif" font-size="34" font-weight="800" fill="#ffffff">Creativo</text>
  </g>

  <rect x="96" y="210" width="1008" height="2" fill="#2a2a42"/>

  <text x="96" y="300" font-family="Cairo, sans-serif" font-size="56" font-weight="800" fill="#ffffff">${product.title}</text>
  <text x="96" y="360" font-family="Cairo, sans-serif" font-size="28" fill="#a9a9c7">${category?.name ?? ''} — ${product.author}</text>

  <foreignObject x="96" y="410" width="1000" height="150">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Cairo, sans-serif; font-size: 24px; color: #c8c8e2; line-height: 1.9; direction: rtl; text-align: right;">
      ${product.desc}
    </div>
  </foreignObject>

  <rect x="96" y="600" width="1008" height="120" rx="18" fill="#0b0b14" opacity="0.7"/>
  <text x="140" y="650" font-family="Cairo, sans-serif" font-size="24" fill="#e9e9f4">الصيغ: ${formats}  |  الحجم: ${product.size}</text>
  <text x="140" y="695" font-family="Cairo, sans-serif" font-size="22" fill="#a9a9c7">ملف تجريبي من منصة كرياتيفو — تم التحميل بتاريخ ${date}</text>

  <rect x="96" y="750" width="180" height="8" rx="4" fill="url(#accent)"/>
</svg>`

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safeName = product.title.replace(/\s+/g, '-').replace(/[^\u0600-\u06FF\w-]/g, '')
  a.href = url
  a.download = `creativo-${product.id}-${safeName}.svg`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
