import { Link } from 'react-router-dom'
import {
  Crown,
  Download,
  Heart,
  CalendarClock,
  Trash2,
  ArrowLeft,
  Sparkles,
  FileDown,
} from 'lucide-react'
import { useApp, FREE_MONTHLY_LIMIT } from '../context/AppContext'
import { getProduct } from '../data/products'
import { getCategory } from '../data/categories'
import { formatDate } from '../utils/format'
import { generateProductFile } from '../utils/download'

export default function Dashboard() {
  const {
    user,
    setAuthOpen,
    plan,
    isSubscribed,
    billing,
    periodEnd,
    daysLeft,
    downloads,
    favorites,
    freeUsageThisMonth,
    cancelSubscription,
    addToast,
  } = useApp()

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-violet-500/15 text-violet-400">
          <Crown className="h-10 w-10" />
        </span>
        <h1 className="mt-5 text-2xl font-black text-white">لوحة التحكم</h1>
        <p className="mt-2 text-white/55">سجّل الدخول لعرض اشتراكك وتحكم في تحميلاتك.</p>
        <button
          onClick={() => setAuthOpen(true)}
          className="mt-6 rounded-full bg-gradient-to-l from-violet-600 to-fuchsia-600 px-8 py-3.5 font-bold text-white"
        >
          تسجيل الدخول
        </button>
      </div>
    )
  }

  const downloadProducts = downloads
    .map((d) => ({ record: d, product: getProduct(d.productId) }))
    .filter((x) => x.product)

  const favoriteProducts = favorites.map((id) => getProduct(id)).filter(Boolean)

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      {/* ترحيب */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-l from-violet-950/70 to-ink-800 p-8">
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-sm text-white/50">مرحباً بعودتك 👋</p>
            <h1 className="mt-1 text-3xl font-black text-white">{user.name}</h1>
            <p className="mt-1 text-sm text-white/50">{user.email}</p>
          </div>
          {!isSubscribed && (
            <Link
              to="/pricing"
              className="flex items-center gap-2 rounded-full bg-gradient-to-l from-violet-600 to-fuchsia-600 px-7 py-3.5 font-bold text-white shadow-lg shadow-fuchsia-900/40 transition hover:scale-[1.02]"
            >
              <Sparkles className="h-5 w-5" />
              قم بالترقية لتحميل غير محدود
            </Link>
          )}
        </div>
      </div>

      {/* بطاقة الاشتراك */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-ink-800/70 p-7">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white">خطة الاشتراك</h2>
            {isSubscribed && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
                <Crown className="h-3.5 w-3.5" /> نشطة
              </span>
            )}
          </div>
          <p className="mt-4 text-3xl font-black text-gradient">{plan.name}</p>
          <p className="mt-1 text-sm text-white/50">
            {isSubscribed
              ? `فوترة ${billing === 'yearly' ? 'سنوية' : 'شهرية'} — ${plan.monthly} ر.س/شهر`
              : 'الخطة المجانية'}
          </p>
          {isSubscribed && periodEnd && (
            <div className="mt-5 space-y-2 rounded-2xl bg-ink-900/70 p-4 text-sm">
              <p className="flex items-center gap-2 text-white/60">
                <CalendarClock className="h-4 w-4 text-violet-400" />
                تاريخ التجديد: {formatDate(periodEnd)}
              </p>
              <p className="text-white/60">متبقٍّ على التجديد: <span className="font-bold text-white">{daysLeft} يوم</span></p>
            </div>
          )}
          {isSubscribed ? (
            <button
              onClick={() => {
                if (confirm('هل أنت متأكد من إلغاء الاشتراك؟ ستنتقل للخطة المجانية.')) {
                  cancelSubscription()
                }
              }}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 py-3 text-sm font-bold text-rose-300 transition hover:bg-rose-500/10"
            >
              <Trash2 className="h-4 w-4" />
              إلغاء الاشتراك
            </button>
          ) : (
            <Link
              to="/pricing"
              className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              عرض الخطط <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
        </div>

        {/* إحصائيات */}
        <div className="rounded-3xl border border-white/10 bg-ink-800/70 p-7">
          <h2 className="font-bold text-white">إحصائياتك</h2>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-ink-900/70 p-4 text-center">
              <Download className="mx-auto h-6 w-6 text-sky-400" />
              <p className="mt-2 text-2xl font-black text-white">{downloads.length}</p>
              <p className="text-xs text-white/45">إجمالي التحميلات</p>
            </div>
            <div className="rounded-2xl bg-ink-900/70 p-4 text-center">
              <Heart className="mx-auto h-6 w-6 text-rose-400" />
              <p className="mt-2 text-2xl font-black text-white">{favorites.length}</p>
              <p className="text-xs text-white/45">منتج مفضل</p>
            </div>
          </div>
          {!isSubscribed && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-white/55">
                <span>تحميلاتك المجانية هذا الشهر</span>
                <span className="font-bold text-white">
                  {freeUsageThisMonth}/{FREE_MONTHLY_LIMIT}
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink-900">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-violet-500 to-fuchsia-500 transition-all"
                  style={{ width: `${Math.min(100, (freeUsageThisMonth / FREE_MONTHLY_LIMIT) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-white/40">
                المنتجات المجانية لا تُحتسب ضمن هذا الحد.
              </p>
            </div>
          )}
        </div>

        {/* ترقية */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-b from-amber-500/10 to-ink-800 p-7">
          <Crown className="h-10 w-10 text-amber-400" />
          <h2 className="mt-4 font-bold text-white">
            {isSubscribed ? 'شكراً لكونك مشتركاً مميزاً' : 'اطلق العنان لكل المكتبة'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/55">
            {isSubscribed
              ? 'كل المنتجات الجديدة تُضاف إلى حسابك تلقائياً بدون أي رسوم إضافية.'
              : 'اشترك ابتداءً من 49 ر.س شهرياً وحمّل أي منتج بدون قيود مع رخصة تجارية.'}
          </p>
          {!isSubscribed && (
            <Link
              to="/pricing"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-2.5 text-sm font-black text-amber-950 transition hover:bg-amber-300"
            >
              ترقية الآن <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {/* التحميلات */}
      <div className="mt-10">
        <h2 className="mb-5 flex items-center gap-2 text-xl font-black text-white">
          <FileDown className="h-5 w-5 text-violet-400" />
          مكتبة التحميلات ({downloadProducts.length})
        </h2>
        {downloadProducts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-ink-800/40 p-12 text-center">
            <p className="text-white/50">لم تقم بتحميل أي منتج بعد.</p>
            <Link
              to="/browse"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/5 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              ابدأ التصفح <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            {downloadProducts.map(({ record, product }) => {
              const cat = getCategory(product!.category)
              return (
                <div
                  key={`${record.productId}-${record.date}`}
                  className="flex items-center gap-4 border-b border-white/5 bg-ink-800/50 px-5 py-4 last:border-0"
                >
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${cat?.gradient}`}>
                    {cat && <cat.icon className="h-5 w-5 text-white" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/product/${product!.id}`}
                      className="block truncate font-bold text-white transition hover:text-violet-300"
                    >
                      {product!.title}
                    </Link>
                    <p className="text-xs text-white/45">
                      {cat?.name} • حُمّل {formatDate(record.date)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      generateProductFile(product!.id)
                      addToast('بدأ إعادة التحميل ✅')
                    }}
                    className="shrink-0 rounded-lg bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-600"
                  >
                    تحميل مجدداً
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* المفضلة */}
      {favoriteProducts.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-black text-white">
            <Heart className="h-5 w-5 text-rose-400" />
            قائمة المفضلة ({favoriteProducts.length})
          </h2>
          <div className="flex flex-wrap gap-3">
            {favoriteProducts.map(
              (p) =>
                p && (
                  <Link
                    key={p.id}
                    to={`/product/${p.id}`}
                    className="rounded-full border border-white/10 bg-ink-800/60 px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-rose-500/40 hover:text-rose-300"
                  >
                    {p.title}
                  </Link>
                ),
            )}
          </div>
        </div>
      )}
    </div>
  )
}
