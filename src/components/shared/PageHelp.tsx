import { useEffect, useId, useRef, useState } from 'react'
import {
  Activity,
  Apple,
  Building2,
  CalendarCheck,
  Check,
  CircleHelp,
  Copy,
  Heart,
  LineChart,
  NotebookPen,
  Ruler,
  Tags,
  UserRound,
  Users,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn } from '@/utils/cn'
import type { PageHelpIcon, PageHelpItem } from '@/content/help'

const ICONS: Record<PageHelpIcon, LucideIcon> = {
  calendar: CalendarCheck,
  wallet: Wallet,
  user: UserRound,
  users: Users,
  utensils: UtensilsCrossed,
  copy: Copy,
  apple: Apple,
  tags: Tags,
  ruler: Ruler,
  activity: Activity,
  notebook: NotebookPen,
  heart: Heart,
  check: Check,
  building: Building2,
  chart: LineChart,
}

export function PageHelp({
  items,
  title = '¿Cómo funciona esta pantalla?',
  compact = false,
}: {
  items: PageHelpItem[]
  title?: string
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (items.length === 0) return null

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={title}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-zinc-500 transition-colors',
          'hover:bg-zinc-100 hover:text-zinc-800',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          compact ? 'px-2 py-1.5' : 'px-2.5 py-2',
          open && 'bg-zinc-100 text-zinc-800',
        )}
      >
        <CircleHelp className="size-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Ayuda</span>
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-label={title}
          className={cn(
            'absolute right-0 z-30 mt-1.5 max-h-[min(70vh,28rem)] w-[min(calc(100vw-2rem),22rem)] overflow-y-auto sm:w-[26rem]',
            'rounded-[var(--radius-card)] border border-zinc-200 bg-surface p-4 shadow-lg',
          )}
        >
          <p className="mb-3 text-xs font-semibold tracking-wide text-zinc-400 uppercase">{title}</p>
          <div className="space-y-4">
            {items.map((item, index) => {
              const Icon = item.icon ? ICONS[item.icon] : CircleHelp
              return (
                <div key={item.question} className={cn(index > 0 && 'border-t border-zinc-100 pt-4')}>
                  <div className="flex items-start gap-2.5">
                    <Icon className="mt-0.5 size-4 shrink-0 text-zinc-400" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-zinc-900">{item.question}</p>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-600">{item.answer}</p>
                      {item.chips && item.chips.length > 0 && (
                        <ul className="mt-2.5 space-y-1.5">
                          {item.chips.map((chip) => (
                            <li key={chip.label} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <Badge tone={chip.tone ?? 'neutral'}>{chip.label}</Badge>
                              <span className="text-xs text-zinc-500">{chip.hint}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
