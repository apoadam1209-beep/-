import { Link } from 'react-router-dom'
import { Mail, Twitter, Instagram, Youtube, ShieldCheck, CreditCard } from 'lucide-react'
import Logo from './Logo'
import { categories } from '../data/categories'

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-ink-950">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-7 text-white/50">
              منصة عربية للمنتجات الرقمية باشتراك واحد شهري أو سنوي — آلاف الأصول الإبداعية
              للمصممين والمطورين وصنّاع المحتوى.
            </p>
            <div className="mt-5 flex gap-3">
              {[Twitter, Instagram, Youtube, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-white/60 transition hover:border-violet-500 hover:text-violet-400"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-bold text-white">روابط سريعة</h4>
            <ul className="space-y-2.5 text-sm text-white/55">
              <li><Link to="/browse" className="transition hover:text-violet-400">تصفح المنتجات</Link></li>
              <li><Link to="/categories" className="transition hover:text-violet-400">جميع الأقسام</Link></li>
              <li><Link to="/pricing" className="transition hover:text-violet-400">خطط الاشتراك</Link></li>
              <li><Link to="/dashboard" className="transition hover:text-violet-400">لوحة التحكم</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-bold text-white">الأقسام</h4>
            <ul className="grid grid-cols-1 gap-2.5 text-sm text-white/55">
              {categories.slice(0, 7).map((c) => (
                <li key={c.id}>
                  <Link to={`/categories/${c.id}`} className="transition hover:text-violet-400">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-bold text-white">ثقة وأمان</h4>
            <ul className="space-y-3 text-sm text-white/55">
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> رخصة استخدام تجارية مع كل اشتراك
              </li>
              <li className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-sky-400" /> دفع آمن تجريبي (لا تُخصم مبالغ حقيقية)
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-fuchsia-400" /> support@creativo.app
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-6 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} Creativo — جميع الحقوق محفوظة.</p>
          <p>الملفات المحمّلة في هذه النسخة التجريبية هي ملفات تعريفية توضيحية.</p>
        </div>
      </div>
    </footer>
  )
}
