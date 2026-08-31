import { CheckCircle2, XCircle, Info } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function ToastContainer() {
  const { toasts } = useApp()
  return (
    <div className="fixed bottom-6 left-1/2 z-[100] flex w-[min(92vw,440px)] -translate-x-1/2 flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-pop glass flex items-center gap-3 rounded-2xl border border-white/10 px-5 py-4 text-sm shadow-2xl shadow-violet-950/40"
        >
          {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />}
          {toast.type === 'error' && <XCircle className="h-5 w-5 shrink-0 text-rose-400" />}
          {toast.type === 'info' && <Info className="h-5 w-5 shrink-0 text-sky-400" />}
          <span className="text-white/90">{toast.message}</span>
        </div>
      ))}
    </div>
  )
}
