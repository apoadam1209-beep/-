import { Link } from 'react-router-dom'
import { Star, Download, Heart, FileDown, Lock } from 'lucide-react'
import type { Product } from '../data/products'
import { getCategory } from '../data/categories'
import { useApp } from '../context/AppContext'
import { formatNumber, formatPrice } from '../utils/format'

export default function ProductCard({ product }: { product: Product }) {
  const cat = getCategory(product.category)
  const Icon = cat?.icon
  const { isFavorite, toggleFavorite, isSubscribed, addToast } = useApp()
  const fav = isFavorite(product.id)

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-ink-800/60 transition duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:shadow-2xl hover:shadow-violet-950/40">
      <Link
        to={`/product/${product.id}`}
        className={`relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br ${cat?.gradient}`}
      >
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_30%_20%,white,transparent_45%)]" />
        {Icon && (
          <Icon className="h-16 w-16 text-white/90 drop-shadow-lg transition duration-300 group-hover:scale-110" strokeWidth={1.5} />
        )}
        <span className="absolute top-3 right-3 rounded-full bg-black/40 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
          {cat?.name}
        </span>
        {product.free ? (
          <span className="absolute top-3 left-3 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-black text-emerald-950">
            مجاني
          </span>
        ) : !isSubscribed ? (
          <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black text-amber-950">
            <Lock className="h-3 w-3" /> {formatPrice(product.price)}
          </span>
        ) : (
          <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-violet-500 px-3 py-1 text-[11px] font-black text-white">
            <FileDown className="h-3 w-3" /> مشمول
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link to={`/product/${product.id}`}>
          <h3 className="line-clamp-1 font-bold text-white transition hover:text-violet-300">
            {product.title}
          </h3>
        </Link>
        <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-6 text-white/50">{product.desc}</p>

        <div className="mt-3 flex items-center gap-3 text-xs text-white/45">
          <span className="flex items-center gap-1 text-amber-400">
            <Star className="h-3.5 w-3.5 fill-amber-400" /> {product.rating.toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <Download className="h-3.5 w-3.5" /> {formatNumber(product.downloads)}
          </span>
          <span className="rounded bg-white/5 px-2 py-0.5 font-semibold">{product.formats[0]}</span>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-white/5 pt-3">
          <Link
            to={`/product/${product.id}`}
            className="flex-1 rounded-lg bg-white/5 py-2 text-center text-sm font-bold text-white transition hover:bg-violet-600"
          >
            التفاصيل
          </Link>
          <button
            onClick={() => {
              toggleFavorite(product.id)
              addToast(fav ? 'أُزيل من المفضلة' : 'أُضيف إلى المفضلة ❤️', 'info')
            }}
            className={`grid h-9 w-9 place-items-center rounded-lg border transition ${
              fav
                ? 'border-rose-500/50 bg-rose-500/15 text-rose-400'
                : 'border-white/10 text-white/50 hover:border-rose-500/40 hover:text-rose-400'
            }`}
            aria-label="المفضلة"
          >
            <Heart className={`h-4 w-4 ${fav ? 'fill-rose-400' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  )
}
