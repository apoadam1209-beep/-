import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { Category } from '../data/categories'
import { productsByCategory } from '../data/products'

export default function CategoryCard({ category, compact = false }: { category: Category; compact?: boolean }) {
  const Icon = category.icon
  const count = productsByCategory(category.id).length
  return (
    <Link
      to={`/categories/${category.id}`}
      className="group relative overflow-hidden rounded-2xl border border-white/5 bg-ink-800/60 p-5 transition duration-300 hover:-translate-y-1 hover:border-white/20"
    >
      <div
        className={`absolute -left-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${category.gradient} opacity-20 blur-2xl transition group-hover:opacity-40`}
      />
      <div
        className={`relative grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${category.gradient} shadow-lg`}
      >
        <Icon className="h-6 w-6 text-white" strokeWidth={1.8} />
      </div>
      <h3 className="relative mt-4 font-bold text-white">{category.name}</h3>
      {!compact && <p className="relative mt-1 line-clamp-2 text-xs leading-5 text-white/50">{category.desc}</p>}
      <div className="relative mt-3 flex items-center justify-between text-xs">
        <span className="font-semibold text-white/45">{count} منتجات</span>
        <span className="flex items-center gap-1 font-bold text-violet-400 opacity-0 transition group-hover:opacity-100">
          تصفح <ArrowLeft className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  )
}
