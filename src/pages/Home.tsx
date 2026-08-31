import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Sparkles,
  Infinity as InfinityIcon,
  ShieldCheck,
  Download,
  RefreshCcw,
  Headphones,
  Star,
  Crown,
  CheckCircle2,
} from 'lucide-react'
import { categories } from '../data/categories'
import { products, featuredProducts } from '../data/products'
import { plans } from '../data/plans'
import CategoryCard from '../components/CategoryCard'
import ProductCard from '../components/ProductCard'
import { formatNumber } from '../utils/format'

export default function Home() {
  const popular = plans.find((p) => p.popular)!

  return (
    <div>
      {/* ===== Hero ===== */}
      <section className="bg-grid relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[140px]" />
        <div className="pointer-events-none absolute top-40 right-0 h-[320px] w-[320px] rounded-full bg-fuchsia-600/15 blur-[120px]" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="animate-slide-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm font-semibold text-violet-300">
              <Sparkles className="h-4 w-4" />
              +{products.length} منتج رقمي في {categories.length} قسماً
            </span>
            <h1 className="mt-6 text-4xl font-black leading-[1.25] text-white sm:text-5xl lg:text-6xl">
              كل ما يحتاجه المبدع
              <br />
              <span className="text-gradient">في اشتراك واحد</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-white/60">
              قوالب، خطوط، صور، فيديو، موسيقى، أيقونات، كتب وكورسات — حمّل بلا حدود
              باشتراك شهري أو سنوي يناسب الأفراد والفرق والوكالات.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/pricing"
                className="flex items-center gap-2 rounded-full bg-gradient-to-l from-violet-600 to-fuchsia-600 px-7 py-3.5 font-bold text-white shadow-xl shadow-fuchsia-900/40 transition hover:scale-[1.02]"
              >
                ابدأ اشتراكك الآن
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <Link
                to="/browse"
                className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 font-bold text-white transition hover:bg-white/10"
              >
                تصفح المنتجات مجاناً
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/50">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> إلغاء في أي وقت
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> رخصة تجارية
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> خطة مجانية دائمة
              </span>
            </div>
          </div>

          <div className="animate-floaty relative hidden lg:block">
            <img
              src="/hero.png"
              alt="منتجات كرياتيفو الرقمية"
              className="w-full rounded-3xl border border-white/10 shadow-2xl shadow-violet-950/50"
            />
            <div className="glass absolute -bottom-6 -right-6 flex items-center gap-3 rounded-2xl border border-white/10 px-5 py-4">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <Download className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-black text-white">+{formatNumber(420000)}</p>
                <p className="text-xs text-white/50">عملية تحميل</p>
              </div>
            </div>
            <div className="glass absolute -top-5 -left-5 flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <span className="text-sm font-bold text-white">4.9/5 تقييم المبدعين</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== الإحصائيات ===== */}
      <section className="border-y border-white/5 bg-ink-900/60">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4">
          {[
            { value: `${categories.length}`, label: 'قسماً إبداعياً' },
            { value: `+${products.length}`, label: 'منتجاً رقمياً' },
            { value: '+12K', label: 'مشترك نشط' },
            { value: '4.9/5', label: 'متوسط التقييم' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-black text-gradient">{s.value}</p>
              <p className="mt-1 text-sm text-white/50">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== الأقسام ===== */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-white">15 قسماً لكل احتياج</h2>
            <p className="mt-2 text-white/55">مهما كان مشروعك، ستجد الأصول المناسبة جاهزة للتحميل.</p>
          </div>
          <Link
            to="/categories"
            className="flex items-center gap-1.5 font-bold text-violet-400 transition hover:gap-3"
          >
            كل الأقسام <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {categories.map((cat) => (
            <CategoryCard key={cat.id} category={cat} compact />
          ))}
        </div>
      </section>

      {/* ===== المنتجات المميزة ===== */}
      <section className="border-y border-white/5 bg-ink-900/60">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="mb-2 inline-flex items-center gap-1.5 text-sm font-bold text-amber-400">
                <Crown className="h-4 w-4" /> اختيارات الموسم
              </span>
              <h2 className="text-3xl font-black text-white">منتجات مميزة</h2>
            </div>
            <Link
              to="/browse"
              className="flex items-center gap-1.5 font-bold text-violet-400 transition hover:gap-3"
            >
              تصفح الكل <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== المميزات ===== */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-black text-white">لماذا كرياتيفو؟</h2>
          <p className="mt-2 text-white/55">اشتراك واحد يحل كل احتياجاتك الإبداعية.</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: InfinityIcon, title: 'تحميل غير محدود', desc: 'بعد الاشتراك حمّل أي عدد من المنتجات بدون قيود يومية أو شهرية.', color: 'text-violet-400 bg-violet-500/15' },
            { icon: ShieldCheck, title: 'رخصة تجارية', desc: 'استخدم كل التحميلات في مشاريعك الشخصية ومشاريع عملائك بأمان.', color: 'text-emerald-400 bg-emerald-500/15' },
            { icon: RefreshCcw, title: 'إلغاء في أي وقت', desc: 'بدون عقود أو التزامات — ألغِ اشتراكك بنقرة واحدة وقتما تشاء.', color: 'text-sky-400 bg-sky-500/15' },
            { icon: Headphones, title: 'دعم بالعربية', desc: 'فريق دعم متكلم بالعربية جاهز لمساعدتك في أي وقت.', color: 'text-amber-400 bg-amber-500/15' },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/5 bg-ink-800/60 p-6 transition hover:border-violet-500/30"
            >
              <span className={`grid h-12 w-12 place-items-center rounded-xl ${f.color}`}>
                <f.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-bold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/50">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== باقة مقترحة ===== */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-l from-violet-950/80 via-ink-800 to-fuchsia-950/60 p-8 sm:p-12">
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-fuchsia-600/20 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-amber-950">
                <Crown className="h-3.5 w-3.5" /> الأكثر شيوعاً
              </span>
              <h2 className="mt-4 text-3xl font-black text-white">خطة {popular.name}</h2>
              <p className="mt-2 max-w-xl text-white/60">
                {popular.tagline} — تحميل غير محدود لكل المنتجات مع رخصة تجارية كاملة،
                مقابل {popular.monthly} ر.س شهرياً فقط، أو وفر مع الاشتراك السنوي.
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-3">
              <Link
                to="/checkout/pro"
                className="rounded-full bg-gradient-to-l from-violet-600 to-fuchsia-600 px-8 py-4 text-center font-bold text-white shadow-xl shadow-fuchsia-900/40 transition hover:scale-[1.02]"
              >
                اشترك في برو الآن
              </Link>
              <Link
                to="/pricing"
                className="rounded-full border border-white/20 px-8 py-3 text-center font-bold text-white/90 transition hover:bg-white/10"
              >
                مقارنة كل الخطط
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
