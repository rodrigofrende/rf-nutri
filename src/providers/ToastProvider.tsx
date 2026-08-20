import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/utils/cn'

type ToastTone = 'success' | 'error' | 'info'
interface Toast {
  id: number
  tone: ToastTone
  message: string
  durationMs: number
}

interface ToastContextValue {
  notify: (message: string, tone?: ToastTone, durationMs?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info }
const TONES = {
  success: 'border-emerald-200 bg-emerald-50/80 text-emerald-800',
  error: 'border-red-200 bg-red-50/80 text-red-800',
  info: 'border-zinc-200 bg-white text-zinc-800',
}

let counter = 0

function defaultDurationMs(message: string, tone: ToastTone): number {
  if (tone === 'error') return 14000
  return Math.min(14000, Math.max(7000, message.length * 80))
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, tone: ToastTone = 'info', durationMs?: number) => {
      const id = ++counter
      setToasts((prev) => [
        ...prev,
        { id, tone, message, durationMs: durationMs ?? defaultDurationMs(message, tone) },
      ])
    },
    [],
  )

  const hasError = toasts.some((t) => t.tone === 'error')

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:w-full"
        aria-live={hasError ? 'assertive' : 'polite'}
        aria-relevant="additions"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const remainingMs = useRef(toast.durationMs)
  const startedAt = useRef(Date.now())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const Icon = ICONS[toast.tone]
  const dismiss = useCallback(() => onDismiss(toast.id), [onDismiss, toast.id])

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    clearTimer()
    startedAt.current = Date.now()
    timer.current = setTimeout(dismiss, remainingMs.current)
  }, [clearTimer, dismiss])

  const pause = () => {
    clearTimer()
    remainingMs.current = Math.max(0, remainingMs.current - (Date.now() - startedAt.current))
  }

  useEffect(() => {
    startTimer()
    return clearTimer
  }, [startTimer, clearTimer])

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={pause}
      onMouseLeave={startTimer}
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg',
        TONES[toast.tone],
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p className="flex-1 text-sm leading-relaxed text-zinc-800">{toast.message}</p>
      <button
        type="button"
        onClick={dismiss}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-black/5 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        aria-label="Cerrar notificación"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}
