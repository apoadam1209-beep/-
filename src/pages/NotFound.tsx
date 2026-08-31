import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-28 text-center">
      <p className="bg-gradient-to-l from-violet-500 to-fuchsia-500 bg-clip-text text-8xl font-black text-transparent">
        404
      </p>
      <h1 className="mt-4 text-2xl font-black text-white">الصفحة غير موجودة</h1>
      <p className="mt-2 text-white/55">
        يبدو أن الرابط الذي اتبعته لا يؤدي إلى أي منتج أو صفحة على كرياتيفو.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-full bg-gradient-to-l from-violet-600 to-fuchsia-600 px-6 py-3 font-bold text-white"
        >
          <Home className="h-4 w-4" />
          الصفحة الرئيسية
        </Link>
        <Link
          to="/browse"
          className="flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 font-bold text-white/80 transition hover:bg-white/10"
        >
          تصفح المنتجات
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
