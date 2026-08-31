import { useParams, Link, Navigate, useNavigate } from 'react-router-dom'
import {
  Star,
  Download,
  Heart,
  Lock,
  FileCheck2,
  HardDrive,
  User,
  ShieldCheck,
  Crown,
} from 'lucide-react'
import { getProduct, productsByCategory } from '../data/products'
import { getCategory } from '../data/categories'
import { useApp } from '../context/AppContext'
import { formatNumber, formatPrice } from '../utils/format'
import { generateProductFile } from '../utils/download'
import ProductCard from '../components/ProductCard'

export default function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const product = id ? getProduct(Number(id)) : undefined
  const {
    user,
    isSubscribed,
    plan,
    canDownload,
    recordDownload,
    isFavorite,
    toggleFavorite,
    setAuthOpen,
    freeUsageThisMonth,
    addToast,
  } = useApp()

  if (!product) return <Navigate to="/browse" replace />

  const cat = getCategory(product.category)!
  const Icon = cat.icon
  const fav = isFavorite(product.id)
  const check = canDownload(product)
  const related = productsByCategory(product.category)
    .filter((p) => p.id !== product.id)
    .slice(0, 4)

  const handleDownload = () => {
    if (!user) {
      setAuthOpen(true)
      addToast('سجّل الدخول أولاً لتتمكن من التحميل', 'error')
      return
    }
    const result = recordDownload(product)
    if (!result.allowed) {
      addToast(result.reason ?? 'لا يمكنك تحميل هذا المنتج حالياً', 'error')
      return
    }
    generateProductFile(product.id)
    addToast(`بدأ تحميل "${product.title}" ✅`)
  }

  const locked = !product.free && !isSubscribed

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-white/40">
        <Link to="/" className="transition hover:text-white">الرئيسية</Link>
        <span>/</span>
        <Link to="/categories" className="transition hover:text-white">الأقسام</Link>
        <span>/</span>
        <Link to={`/categories/${cat.id}`} className="transition hover:text-white">{cat.name}</Link>
        <span>/</span>
        <span className="text-white/70">{product.title}</span>
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_1fr]">
        {/* الغلاف */}
        <div>
          <div
            className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br ${cat.gradient}`}
          >
            <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_30%_20%,white,transparent_45%)]" />
            <Icon className="h-28 w-28 text-white/90 drop-shadow-2xl" strokeWidth={1.2} />
            {product.free ? (
              <span className="absolute top-5 right-5 rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-black text-emerald-950">
                مجاني
              </span>
            ) : isSubscribed ? (
              <span className="absolute top-5 right-5 flex items-center gap-1.5 rounded-full bg-violet-500 px-4 py-1.5 text-sm font-black text-white">
                <Crown className="h-4 w-4" /> مشمول باشتراكك
              </span>
            ) : (
              <span className="absolute top-5 right-5 flex items-center gap-1.5 rounded-full bg-black/50 px-4 py-1.5 text-sm font-black text-white backdrop-blur-sm">
                <Lock className="h-4 w-4" /> يحتاج اشتراكاً
              </span>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-white/5 bg-ink-800/60 p-6">
            <h2 className="text-lg font-bold text-white">وصف المنتج</h2>
            <p className="mt-3 leading-8 text-white/60">{product.desc}</p>
            <p className="mt-3 leading-8 text-white/60">
              يأتي المنتج بصيغ {product.formats.join('، ')} وبحجم {product.size}، مع رخصة
              استخدام شخصية وتجارية حسب خطتك، وتحديثات مجانية مستقبلية من {product.author}.
            </p>
          </div>
        </div>

        {/* لوحة المعلومات */}
        <div>
          <span className="inline-block rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-violet-300">
            {cat.name}
          </span>
          <h1 className="mt-3 text-3xl font-black leading-snug text-white">{product.title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/55">
            <span className="flex items-center gap-1.5 text-amber-400">
              <Star className="h-4 w-4 fill-amber-400" />
              {product.rating.toFixed(1)} تقييم
            </span>
            <span className="flex items-center gap-1.5">
              <Download className="h-4 w-4" />
              {formatNumber(product.downloads)} تحميل
            </span>
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {product.author}
            </span>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-ink-800/80 p-6">
            <div className="flex items-end justify-between">
              <div>
                {product.free ? (
                  <p className="text-3xl font-black text-emerald-400">مجاني</p>
                ) : (
                  <>
                    <p className="text-sm text-white/45">سعر الشراء المفرد</p>
                    <p className="text-3xl font-black text-white">{formatPrice(product.price)}</p>
                  </>
                )}
              </div>
              {!product.free && !isSubscribed && (
                <p className="max-w-[160px] text-left text-xs leading-5 text-white/45">
                  أو حمّله مجاناً ضمن اشتراك يبدأ من {formatPrice(49)}/شهر
                </p>
              )}
            </div>

            <button
              onClick={handleDownload}
              className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white shadow-lg transition hover:scale-[1.01] ${
                locked
                  ? 'bg-gradient-to-l from-violet-600 to-fuchsia-600 shadow-fuchsia-900/30'
                  : 'bg-emerald-600 shadow-emerald-900/30 hover:bg-emerald-500'
              }`}
            >
              {locked ? (
                <>
                  <Lock className="h-5 w-5" /> افتح الاشتراك للتحميل
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" /> تحميل الآن
                </>
              )}
            </button>

            {locked && (
              <button
                onClick={() => navigate('/pricing')}
                className="mt-3 w-full rounded-xl border border-white/15 py-3.5 font-bold text-white transition hover:bg-white/10"
              >
                عرض خطط الاشتراك
              </button>
            )}

            <button
              onClick={() => toggleFavorite(product.id)}
              className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border py-3.5 font-bold transition ${
                fav
                  ? 'border-rose-500/50 bg-rose-500/10 text-rose-300'
                  : 'border-white/10 text-white/70 hover:border-rose-500/40 hover:text-rose-300'
              }`}
            >
              <Heart className={`h-5 w-5 ${fav ? 'fill-rose-400' : ''}`} />
              {fav ? 'أُضيف إلى المفضلة' : 'أضف إلى المفضلة'}
            </button>

            {!product.free && !isSubscribed && user && (
              <p className="mt-4 rounded-xl bg-amber-400/10 px-4 py-3 text-center text-xs leading-6 text-amber-200">
                خطتك الحالية: {plan.name} — استخدمت {freeUsageThisMonth} من 3 تحميلات مجانية
                هذا الشهر.
              </p>
            )}
            {!check.allowed && (
              <p className="mt-3 text-center text-xs leading-6 text-rose-300">{check.reason}</p>
            )}
          </div>

          {/* مواصفات */}
          <div className="mt-6 space-y-3 rounded-2xl border border-white/5 bg-ink-800/60 p-6 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-white/50">
                <FileCheck2 className="h-4 w-4 text-violet-400" /> الصيغ
              </span>
              <span className="font-bold text-white">{product.formats.join('، ')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-white/50">
                <HardDrive className="h-4 w-4 text-sky-400" /> الحجم
              </span>
              <span className="font-bold text-white">{product.size}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-white/50">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> الرخصة
              </span>
              <span className="font-bold text-white">
                {isSubscribed ? 'تجارية كاملة' : 'شخصية'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* منتجات مشابهة */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-black text-white">منتجات مشابهة في {cat.name}</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
