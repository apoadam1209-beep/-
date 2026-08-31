import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Search, Menu, X, User as UserIcon, LayoutDashboard, LogOut, Crown } from 'lucide-react'
import Logo from './Logo'
import { useApp } from '../context/AppContext'

const links = [
  { to: '/', label: 'الرئيسية' },
  { to: '/browse', label: 'تصفح المنتجات' },
  { to: '/categories', label: 'الأقسام' },
  { to: '/pricing', label: 'الأسعار' },
]

export default function Navbar() {
  const { user, isSubscribed, setAuthOpen, logout, addToast } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(`/browse?q=${encodeURIComponent(query)}`)
    setMenuOpen(false)
  }

  return (
    <header className="glass fixed inset-x-0 top-0 z-50 border-b border-white/5">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="mr-4 hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <form
          onSubmit={submitSearch}
          className="mr-auto hidden items-center md:flex"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن منتج..."
              className="w-52 rounded-full border border-white/10 bg-ink-800 py-2 pr-10 pl-4 text-sm text-white placeholder:text-white/30 outline-none transition focus:w-72 focus:border-violet-500"
            />
          </div>
        </form>

        <div className="flex items-center gap-2 md:mr-2">
          {user ? (
            <div className="relative hidden md:block">
              <button
                onClick={() => setUserMenu((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-800 py-1.5 pr-1.5 pl-4 transition hover:border-violet-500/50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-sm font-bold text-white">
                  {user.name.charAt(0)}
                </span>
                <span className="max-w-[110px] truncate text-sm font-semibold text-white">
                  {user.name}
                </span>
                {isSubscribed && <Crown className="h-4 w-4 text-amber-400" />}
              </button>
              {userMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenu(false)} />
                  <div className="animate-pop absolute left-0 z-20 mt-2 w-52 overflow-hidden rounded-2xl border border-white/10 bg-ink-800 shadow-2xl">
                    <Link
                      to="/dashboard"
                      onClick={() => setUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-white/80 transition hover:bg-white/5"
                    >
                      <LayoutDashboard className="h-4 w-4" /> لوحة التحكم
                    </Link>
                    {!isSubscribed && (
                      <Link
                        to="/pricing"
                        onClick={() => setUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-amber-300 transition hover:bg-white/5"
                      >
                        <Crown className="h-4 w-4" /> قم بالترقية
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        logout()
                        setUserMenu(false)
                      }}
                      className="flex w-full items-center gap-2 px-4 py-3 text-sm text-rose-300 transition hover:bg-white/5"
                    >
                      <LogOut className="h-4 w-4" /> تسجيل الخروج
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className="hidden items-center gap-2 rounded-full bg-gradient-to-l from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-fuchsia-900/30 transition hover:opacity-90 md:flex"
            >
              <UserIcon className="h-4 w-4" />
              تسجيل الدخول
            </button>
          )}

          {!isSubscribed && (
            <Link
              to="/pricing"
              onClick={() => addToast('اختر خطة الاشتراك المناسبة لك 🚀', 'info')}
              className="hidden rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2.5 text-sm font-bold text-amber-300 transition hover:bg-amber-400/20 xl:block"
            >
              اشترك الآن
            </Link>
          )}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 md:hidden"
            aria-label="القائمة"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* قائمة الجوال */}
      {menuOpen && (
        <div className="animate-fade border-t border-white/5 bg-ink-900/95 px-4 py-4 md:hidden">
          <form onSubmit={submitSearch} className="mb-4 md:hidden">
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن منتج..."
                className="w-full rounded-full border border-white/10 bg-ink-800 py-2.5 pr-10 pl-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-500"
              />
            </div>
          </form>
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-4 py-3 text-sm font-semibold transition ${
                    isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            {user ? (
              <Link
                to="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-semibold text-white/70 hover:bg-white/5"
              >
                لوحة التحكم
              </Link>
            ) : (
              <button
                onClick={() => {
                  setAuthOpen(true)
                  setMenuOpen(false)
                }}
                className="mt-2 rounded-full bg-gradient-to-l from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-bold text-white"
              >
                تسجيل الدخول
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
