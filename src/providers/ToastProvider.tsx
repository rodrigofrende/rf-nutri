import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/utils/cn'

type ToastTone = 'success' | 'error' | 'info'
interface Toast {
  id: number
  tone: ToastTone
  message: string
}

interface ToastContextValue {
  /** `durationMs` opcional; por defecto se adapta al largo del mensaje (4s–10s). */
  notify: (message: string, tone?: ToastTone, durationMs?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info }
const TONES = {
  success: 'border-emerald-200 text-emerald-700',
  error: 'border-red-200 text-red-700',
  info: 'border-zinc-200 text-zinc-700',
}

let counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, tone: ToastTone = 'info', durationMs?: number) => {
      const id = ++counter
      setToasts((prev) => [...prev, { id, tone, message }])
      // Duración adaptada al largo del mensaje (~60ms/char) para dar tiempo a leer
      // los textos largos, con piso 4s y techo 10s. Igual siempre se puede cerrar
      // con la X. El caller puede forzar una duración con `durationMs`.
      const ms = durationMs ?? Math.min(10000, Math.max(4000, message.length * 60))
      setTimeout(() => remove(id), ms)
    },
    [remove],
  )

  const hasError = toasts.some((t) => t.tone === 'error')

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
        aria-live={hasError ? 'assertive' : 'polite'}
        aria-relevant="additions"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.tone]
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                'flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg',
                TONES[t.tone],
              )}
            >
              <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
              <span className="flex-1 text-sm leading-relaxed text-zinc-700">{t.message}</span>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="text-zinc-400 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                aria-label="Cerrar notificación"
              >
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}
