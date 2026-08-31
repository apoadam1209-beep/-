import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Product } from '../data/products'
import { getPlan, plans, type Plan } from '../data/plans'
import { currentMonthKey } from '../utils/format'

export const FREE_MONTHLY_LIMIT = 3
export type Billing = 'monthly' | 'yearly'

export interface User {
  name: string
  email: string
}

export interface DownloadRecord {
  productId: number
  date: string
}

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface AppState {
  user: User | null
  planId: string
  billing: Billing
  subscribedAt: string | null
  periodEnd: string | null
  downloads: DownloadRecord[]
  monthlyUsage: Record<string, number>
  favorites: number[]
}

interface AppContextType extends AppState {
  plan: Plan
  isSubscribed: boolean
  daysLeft: number | null
  toasts: Toast[]
  authOpen: boolean
  setAuthOpen: (open: boolean) => void
  login: (name: string, email: string) => void
  logout: () => void
  subscribe: (planId: string, billing: Billing) => void
  cancelSubscription: () => void
  canDownload: (product: Product) => { allowed: boolean; reason?: string }
  recordDownload: (product: Product) => { allowed: boolean; reason?: string }
  toggleFavorite: (productId: number) => void
  isFavorite: (productId: number) => boolean
  freeUsageThisMonth: number
  addToast: (message: string, type?: Toast['type']) => void
}

const STORAGE_KEY = 'creativo-state-v1'

const defaultState: AppState = {
  user: null,
  planId: 'free',
  billing: 'monthly',
  subscribedAt: null,
  periodEnd: null,
  downloads: [],
  monthlyUsage: {},
  favorites: [],
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState
    return { ...defaultState, ...JSON.parse(raw) }
  } catch {
    return defaultState
  }
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const addToast = (message: string, type: Toast['type'] = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }

  const login = (name: string, email: string) => {
    setState((s) => ({ ...s, user: { name, email } }))
    setAuthOpen(false)
    addToast(`أهلاً بك في كرياتيفو يا ${name}! 🎨`)
  }

  const logout = () => {
    setState((s) => ({ ...s, user: null }))
    addToast('تم تسجيل الخروج بنجاح', 'info')
  }

  const subscribe = (planId: string, billing: Billing) => {
    const now = new Date()
    const end = new Date(now)
    if (billing === 'monthly') end.setMonth(end.getMonth() + 1)
    else end.setFullYear(end.getFullYear() + 1)
    setState((s) => ({
      ...s,
      planId,
      billing,
      subscribedAt: now.toISOString(),
      periodEnd: end.toISOString(),
    }))
  }

  const cancelSubscription = () => {
    setState((s) => ({
      ...s,
      planId: 'free',
      billing: 'monthly',
      subscribedAt: null,
      periodEnd: null,
    }))
    addToast('تم إلغاء الاشتراك، ويمكنك الاستمرار بالخطة المجانية', 'info')
  }

  const isSubscribed =
    state.planId !== 'free' && !!state.periodEnd && new Date(state.periodEnd) > new Date()

  const daysLeft = useMemo(() => {
    if (!state.periodEnd) return null
    const diff = new Date(state.periodEnd).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }, [state.periodEnd])

  const monthKey = currentMonthKey()
  const freeUsageThisMonth = state.monthlyUsage[monthKey] ?? 0

  const canDownload = (product: Product): { allowed: boolean; reason?: string } => {
    if (product.free) return { allowed: true }
    if (isSubscribed) return { allowed: true }
    if (freeUsageThisMonth >= FREE_MONTHLY_LIMIT) {
      return {
        allowed: false,
        reason: 'استنفدت تحميلاتك المجانية لهذا الشهر (3 منتجات مدفوعة). اشترك للتحميل بلا حدود.',
      }
    }
    return { allowed: true }
  }

  const recordDownload = (product: Product) => {
    const check = canDownload(product)
    if (!check.allowed) return check
    setState((s) => ({
      ...s,
      downloads: [{ productId: product.id, date: new Date().toISOString() }, ...s.downloads],
      monthlyUsage: product.free
        ? s.monthlyUsage
        : { ...s.monthlyUsage, [currentMonthKey()]: (s.monthlyUsage[currentMonthKey()] ?? 0) + 1 },
    }))
    return { allowed: true }
  }

  const toggleFavorite = (productId: number) => {
    setState((s) => ({
      ...s,
      favorites: s.favorites.includes(productId)
        ? s.favorites.filter((id) => id !== productId)
        : [...s.favorites, productId],
    }))
  }

  const isFavorite = (productId: number) => state.favorites.includes(productId)

  const value: AppContextType = {
    ...state,
    plan: getPlan(state.planId) ?? plans[0],
    isSubscribed,
    daysLeft,
    toasts,
    authOpen,
    setAuthOpen,
    login,
    logout,
    subscribe,
    cancelSubscription,
    canDownload,
    recordDownload,
    toggleFavorite,
    isFavorite,
    freeUsageThisMonth,
    addToast,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
