import { Link } from 'react-router-dom'

export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11'
  const text = size === 'sm' ? 'text-xl' : 'text-2xl'
  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <span className={`${dim} grid place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-fuchsia-900/30 transition-transform group-hover:scale-105`}>
        <svg viewBox="0 0 64 64" className="h-3/5 w-3/5">
          <path d="M41 21a15 15 0 1 0 0 22" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
          <circle cx="45" cy="32" r="4.5" fill="#fbbf24" />
        </svg>
      </span>
      <span className={`${text} font-black tracking-tight text-white`}>
        Creativo
        <span className="block text-[10px] font-medium text-white/50">منصة المنتجات الرقمية</span>
      </span>
    </Link>
  )
}
