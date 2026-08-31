import { useParams, Link, Navigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { getCategory } from '../data/categories'
import { productsByCategory } from '../data/products'
import ProductCard from '../components/ProductCard'

export default function CategoryPage() {
  const { id } = useParams()
  const category = id ? getCategory(id) : undefined
  if (!category) return <Navigate to="/categories" replace />

  const items = productsByCategory(category.id)
  const Icon = category.icon

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav className="flex items-center gap-2 text-sm text-white/40">
        <Link to="/" className="transition hover:text-white">الرئيسية</Link>
        <span>/</span>
        <Link to="/categories" className="transition hover:text-white">الأقسام</Link>
        <span>/</span>
        <span className="text-white/70">{category.name}</span>
      </nav>

      <div
        className={`relative mt-6 overflow-hidden rounded-3xl bg-gradient-to-l ${category.gradient} p-8 sm:p-12`}
      >
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_80%_20%,white,transparent_45%)]" />
        <Icon className="absolute -left-6 -bottom-6 h-44 w-44 text-white/15" strokeWidth={1} />
        <div className="relative">
          <span className="inline-grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <Icon className="h-7 w-7 text-white" />
          </span>
          <h1 className="mt-5 text-3xl font-black text-white sm:text-4xl">{category.name}</h1>
          <p className="mt-2 max-w-xl text-white/85">{category.desc}</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/30 px-4 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
            {items.length} منتجات متاحة
          </p>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div className="mt-12 text-center">
        <Link
          to="/browse"
          className="inline-flex items-center gap-2 font-bold text-violet-400 transition hover:gap-3"
        >
          استكشف منتجات الأقسام الأخرى
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
