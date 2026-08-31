import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Crown, Sparkles } from 'lucide-react'
import { plans } from '../data/plans'
import { useApp, type Billing } from '../context/AppContext'
import { formatPrice } from '../utils/format'

export default function Pricing() {
  const [billing, setBilling] = useState<Billing>('yearly')
  const { planId, isSubscribed, user, setAuthOpen, addToast } = useApp()
  const navigate = useNavigate()

  const choose = (id: string) => {
    if (id === 'free') {
      if (!user) setAuthOpen(true)
      else navigate('/dashboard')
      return
    }
    if (!user) {
      setAuthOpen(true)
      addToast('أنشئ حسابك المجاني أولاً ثم أكمل الاشتراك', 'info')
      return
    }
    navigate(`/checkout/${id}?billing=${billing}`)
  }

  return (
    <div className="bg-grid relative">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm font-semibold text-violet-300">
            <Sparkles className="h-4 w-4" /> بدون عقود — ألغِ في أي وقت
          </span>
          <h1 className="mt-5 text-4xl font-black text-white sm:text-5xl">
            خطط <span className="text-gradient">اشتراك</span> تناسب الجميع
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-white/55">
            اشتراك واحد يفتح لك كل المكتبة: {`75`}+ منتجاً في {`15`} قسماً، مع تحديثات
            أسبوعية ورخصة استخدام تجارية.
          </p>

          {/* مبدل الفوترة */}
          <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-white/10 bg-ink-800 p-1.5">
            <button
              onClick={() => setBilling('monthly')}
              className={`rounded-full px-6 py-2.5 text-sm font-bold transition ${
                billing === 'monthly' ? 'bg-white text-ink-900' : 'text-white/60 hover:text-white'
              }`}
            >
              شهري
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition ${
                billing === 'yearly' ? 'bg-white text-ink-900' : 'text-white/60 hover:text-white'
              }`}
            >
              سنوي
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-300">
                وفّر شهرين
              </span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-4">
          {plans.map((plan) => {
            const price = billing === 'monthly' ? plan.monthly : plan.yearly
            const isCurrent = planId === plan.id && (plan.id === 'free' || isSubscribed)
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl border p-6 transition ${
                  plan.popular
                    ? 'border-violet-500/50 bg-gradient-to-b from-violet-950/60 to-ink-800 shadow-2xl shadow-violet-950/40 lg:-translate-y-3'
                    : 'border-white/10 bg-ink-800/60'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3.5 right-1/2 translate-x-1/2 rounded-full bg-gradient-to-l from-violet-600 to-fuchsia-600 px-4 py-1 text-xs font-black text-white">
                    الأكثر شيوعاً
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-3.5 right-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-black text-emerald-950">
                    خطتك الحالية
                  </span>
                )}

                <div className="flex items-center gap-2">
                  {plan.popular && <Crown className="h-5 w-5 text-amber-400" />}
                  <h3 className="text-xl font-black text-white">{plan.name}</h3>
                </div>
                <p className="mt-1 text-sm text-white/50">{plan.tagline}</p>

                <div className="mt-6">
                  {price === 0 ? (
                    <p className="text-4xl font-black text-white">0 ر.س</p>
                  ) : (
                    <>
                      <p className="text-4xl font-black text-white">
                        {formatPrice(billing === 'yearly' ? Math.round(plan.yearly / 12) : plan.monthly)}
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        {billing === 'yearly'
                          ? `يدفع ${formatPrice(plan.yearly)} سنوياً`
                          : 'يتم الدفع شهرياً'}
                      </p>
                    </>
                  )}
                </div>

                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-white/70">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => choose(plan.id)}
                  disabled={isCurrent}
                  className={`mt-7 w-full rounded-xl py-3.5 font-bold transition ${
                    isCurrent
                      ? 'cursor-default bg-white/10 text-white/50'
                      : plan.popular
                        ? 'bg-gradient-to-l from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-900/30 hover:opacity-90'
                        : 'border border-white/15 bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  {isCurrent ? 'مشترك حالياً' : plan.cta}
                </button>
              </div>
            )
          })}
        </div>

        <p className="mt-10 text-center text-sm text-white/40">
          جميع الأسعار بالريال السعودي وشاملة الضريبة. تحتاج مساعدة للفرق الكبيرة؟{' '}
          <Link to="/pricing" className="font-bold text-violet-400">تواصل معنا</Link>.
        </p>
      </div>
    </div>
  )
}
