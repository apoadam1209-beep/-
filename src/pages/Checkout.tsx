import { useState } from 'react'
import { useParams, useSearchParams, Link, Navigate, useNavigate } from 'react-router-dom'
import { CreditCard, Lock, CheckCircle2, ShieldCheck, Crown } from 'lucide-react'
import { getPlan } from '../data/plans'
import { useApp, type Billing } from '../context/AppContext'
import { formatPrice } from '../utils/format'

export default function Checkout() {
  const { planId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const plan = planId ? getPlan(planId) : undefined
  const { user, setAuthOpen, subscribe } = useApp()

  const billing: Billing = searchParams.get('billing') === 'yearly' ? 'yearly' : 'monthly'
  const [done, setDone] = useState(false)
  const [card, setCard] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [name, setName] = useState(user?.name ?? '')
  const [processing, setProcessing] = useState(false)

  if (!plan || plan.id === 'free') return <Navigate to="/pricing" replace />
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Lock className="mx-auto h-12 w-12 text-violet-400" />
        <h1 className="mt-4 text-2xl font-black text-white">سجّل الدخول للمتابعة</h1>
        <p className="mt-2 text-white/55">تحتاج حساباً مجانياً لإتمام الاشتراك.</p>
        <button
          onClick={() => setAuthOpen(true)}
          className="mt-6 rounded-full bg-gradient-to-l from-violet-600 to-fuchsia-600 px-8 py-3.5 font-bold text-white"
        >
          إنشاء حساب / تسجيل الدخول
        </button>
      </div>
    )
  }

  const amount = billing === 'yearly' ? plan.yearly : plan.monthly

  const valid =
    name.trim().length > 2 &&
    card.replace(/\s/g, '').length >= 12 &&
    expiry.length >= 4 &&
    cvv.length >= 3

  const pay = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setProcessing(true)
    setTimeout(() => {
      subscribe(plan.id, billing)
      setProcessing(false)
      setDone(true)
    }, 1600)
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="animate-pop mx-auto grid h-24 w-24 place-items-center rounded-full bg-emerald-500/15">
          <CheckCircle2 className="h-14 w-14 text-emerald-400" />
        </div>
        <h1 className="mt-6 text-3xl font-black text-white">تم الاشتراك بنجاح! 🎉</h1>
        <p className="mt-3 text-white/60">
          أهلاً بك في خطة <span className="font-bold text-violet-300">{plan.name}</span> —
          أصبح بإمكانك الآن تحميل كل منتجات المكتبة بلا حدود.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => navigate('/browse')}
            className="rounded-full bg-gradient-to-l from-violet-600 to-fuchsia-600 px-8 py-3.5 font-bold text-white"
          >
            ابدأ التحميل الآن
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-full border border-white/15 px-8 py-3.5 font-bold text-white/80 transition hover:bg-white/10"
          >
            لوحة التحكم
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-black text-white">إتمام الاشتراك</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* نموذج الدفع */}
        <form
          onSubmit={pay}
          className="rounded-3xl border border-white/10 bg-ink-800/70 p-6 sm:p-8"
        >
          <div className="mb-6 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-violet-400" />
            <h2 className="text-lg font-bold text-white">بيانات الدفع</h2>
            <span className="mr-auto flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" /> دفع تجريبي آمن
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-white/80">
                الاسم على البطاقة
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم الكامل"
                className="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-white/80">رقم البطاقة</label>
              <input
                value={card}
                onChange={(e) =>
                  setCard(
                    e.target.value
                      .replace(/\D/g, '')
                      .slice(0, 16)
                      .replace(/(\d{4})(?=\d)/g, '$1 '),
                  )
                }
                placeholder="4242 4242 4242 4242"
                inputMode="numeric"
                dir="ltr"
                className="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-left text-white placeholder:text-white/30 outline-none focus:border-violet-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-white/80">
                  تاريخ الانتهاء
                </label>
                <input
                  value={expiry}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                    setExpiry(v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v)
                  }}
                  placeholder="MM/YY"
                  inputMode="numeric"
                  dir="ltr"
                  className="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-left text-white placeholder:text-white/30 outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-white/80">CVV</label>
                <input
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="123"
                  inputMode="numeric"
                  dir="ltr"
                  className="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-left text-white placeholder:text-white/30 outline-none focus:border-violet-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!valid || processing}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-violet-600 to-fuchsia-600 py-4 font-bold text-white shadow-lg shadow-fuchsia-900/30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                جارٍ معالجة الدفع...
              </>
            ) : (
              <>
                <Lock className="h-5 w-5" />
                ادفع {formatPrice(amount)} واشترك الآن
              </>
            )}
          </button>
          <p className="mt-4 text-center text-xs leading-6 text-white/40">
            هذه نسخة تجريبية — لن تُخصم أي مبالغ حقيقية وبيانات البطاقة لا تُرسل لأي خادم.
            يمكنك الإلغاء في أي وقت من لوحة التحكم.
          </p>
        </form>

        {/* ملخص الطلب */}
        <aside className="h-fit rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-950/50 to-ink-800 p-6 sm:p-7">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Crown className="h-5 w-5 text-amber-400" /> ملخص الاشتراك
          </h2>
          <div className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-white/55">الخطة</span>
              <span className="font-bold text-white">{plan.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/55">دورة الفوترة</span>
              <span className="font-bold text-white">{billing === 'yearly' ? 'سنوية' : 'شهرية'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/55">الحساب</span>
              <span className="max-w-[160px] truncate font-bold text-white">{user.email}</span>
            </div>
            {billing === 'yearly' && (
              <div className="flex justify-between text-emerald-300">
                <span>خصم الاشتراك السنوي</span>
                <span className="font-bold">شهران مجاناً</span>
              </div>
            )}
            <div className="border-t border-white/10 pt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-white/70">الإجمالي</span>
                <span className="text-2xl font-black text-white">{formatPrice(amount)}</span>
              </div>
              <p className="mt-1 text-left text-xs text-white/40">
                {billing === 'yearly' ? 'يدفع سنوياً' : 'يدفع شهرياً'}
              </p>
            </div>
          </div>
          <ul className="mt-5 space-y-2 border-t border-white/10 pt-5 text-xs text-white/60">
            {plan.features.slice(0, 4).map((f) => (
              <li key={f} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> {f}
              </li>
            ))}
          </ul>
          <Link
            to="/pricing"
            className="mt-6 block text-center text-sm font-bold text-violet-400 transition hover:text-violet-300"
          >
            تغيير الخطة
          </Link>
        </aside>
      </div>
    </div>
  )
}
