import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function AuthModal() {
  const { authOpen, setAuthOpen, login, addToast } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  if (!authOpen) return null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      addToast('يرجى إدخال الاسم والبريد الإلكتروني', 'error')
      return
    }
    login(name.trim(), email.trim())
    setName('')
    setEmail('')
  }

  return (
    <div
      className="animate-fade fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => setAuthOpen(false)}
    >
      <div
        className="animate-pop glass w-full max-w-md rounded-3xl border border-white/10 p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-black text-white">انضم إلى كرياتيفو</h3>
            <p className="mt-1 text-sm text-white/60">
              حساب مجاني يتيح لك التحميل وحفظ منتجاتك المفضلة
            </p>
          </div>
          <button
            onClick={() => setAuthOpen(false)}
            className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-white/80">الاسم</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اكتب اسمك"
              className="w-full rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-white placeholder:text-white/30 outline-none transition focus:border-violet-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-white/80">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-white placeholder:text-white/30 outline-none transition focus:border-violet-500"
            />
          </div>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-violet-600 to-fuchsia-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-fuchsia-900/30 transition hover:opacity-90"
          >
            <Sparkles className="h-5 w-5" />
            إنشاء الحساب مجاناً
          </button>
          <p className="text-center text-xs text-white/40">
            نسخة تجريبية — تُحفظ بياناتك في متصفحك فقط ولا تُرسل لأي خادم.
          </p>
        </form>
      </div>
    </div>
  )
}
