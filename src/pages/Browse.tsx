import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, PackageOpen } from 'lucide-react'
import { categories } from '../data/categories'
import { products } from '../data/products'
import ProductCard from '../components/ProductCard'

type Sort = 'popular' | 'rating' | 'price-low' | 'price-high'

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [category, setCategory] = useState('all')
  const [freeOnly, setFreeOnly] = useState(false)
  const [sort, setSort] = useState<Sort>('popular')

  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    setQuery(q)
  }, [searchParams])

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (category !== 'all' && p.category !== category) return false
      if (freeOnly && !p.free) return false
      if (query.trim()) {
        const q = query.trim().toLowerCase()
        const cat = categories.find((c) => c.id === p.category)
        const hay = `${p.title} ${p.desc} ${p.author} ${cat?.name ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    list = [...list].sort((a, b) => {
      if (sort === 'popular') return b.downloads - a.downloads
      if (sort === 'rating') return b.rating - a.rating
      if (sort === 'price-low') return a.price - b.price
      return b.price - a.price
    })
    return list
  }, [query, category, freeOnly, sort])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-black text-white sm:text-4xl">تصفح المنتجات</h1>
      <p className="mt-2 text-white/55">
        {products.length} منتجاً رقمياً في {categories.length} قسماً — كلها متاحة للتحميل
        باشتراكك.
      </p>

      {/* شريط البحث */}
      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSearchParams(e.target.value ? { q: e.target.value } : {})
            }}
            placeholder="ابحث باسم المنتج، القسم أو صاحب العمل..."
            className="w-full rounded-2xl border border-white/10 bg-ink-800 py-3.5 pr-12 pl-4 text-white placeholder:text-white/30 outline-none transition focus:border-violet-500"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-2xl border border-white/10 bg-ink-800 px-4 py-3.5 text-sm font-semibold text-white outline-none focus:border-violet-500"
          >
            <option value="popular">الأكثر تحميلاً</option>
            <option value="rating">الأعلى تقييماً</option>
            <option value="price-low">السعر: الأقل</option>
            <option value="price-high">السعر: الأعلى</option>
          </select>
          <button
            onClick={() => setFreeOnly((v) => !v)}
            className={`flex items-center gap-2 rounded-2xl border px-5 py-3.5 text-sm font-bold transition ${
              freeOnly
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                : 'border-white/10 bg-ink-800 text-white/70 hover:border-emerald-500/40'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            المجاني فقط
          </button>
        </div>
      </div>

      {/* أزرار الأقسام */}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory('all')}
          className={`rounded-full px-4 py-2 text-sm font-bold transition ${
            category === 'all'
              ? 'bg-white text-ink-900'
              : 'border border-white/10 bg-ink-800 text-white/60 hover:text-white'
          }`}
        >
          الكل
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              category === c.id
                ? 'bg-gradient-to-l from-violet-600 to-fuchsia-600 text-white'
                : 'border border-white/10 bg-ink-800 text-white/60 hover:text-white'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* النتائج */}
      {filtered.length > 0 ? (
        <>
          <p className="mt-6 text-sm text-white/45">
            عرض <span className="font-bold text-white">{filtered.length}</span> منتج
          </p>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      ) : (
        <div className="mt-20 flex flex-col items-center text-center">
          <span className="grid h-20 w-20 place-items-center rounded-3xl bg-ink-800 text-white/30">
            <PackageOpen className="h-10 w-10" />
          </span>
          <h3 className="mt-5 text-xl font-bold text-white">لا توجد نتائج مطابقة</h3>
          <p className="mt-2 text-white/50">جرّب كلمات بحث أخرى أو غيّر القسم المحدد.</p>
        </div>
      )}
    </div>
  )
}
