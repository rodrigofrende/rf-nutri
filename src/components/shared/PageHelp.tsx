import {
  Activity,
  Apple,
  CalendarCheck,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  Heart,
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
  if (items.length === 0) return null

  return (
    <details className={cn('group', compact ? 'mb-0' : 'mb-5')}>
      <summary
        className={cn(
          'flex w-fit max-w-full cursor-pointer list-none items-center gap-2.5 rounded-[var(--radius-pill)]',
          'border border-brand-100 bg-brand-50/80 px-3 py-2',
          'text-sm font-medium text-brand-800',
          'outline-none transition-colors',
          'hover:border-brand-200 hover:bg-brand-50',
          'focus-visible:ring-2 focus-visible:ring-brand-500',
          'marker:content-none [&::-webkit-details-marker]:hidden',
        )}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-brand-100">
          <CircleHelp className="size-3.5" aria-hidden />
        </span>
        <span className="min-w-0 truncate sm:hidden">Cómo funciona</span>
        <span className="hidden min-w-0 truncate sm:inline">{title}</span>
        <ChevronDown
          className="size-4 shrink-0 text-brand-600 transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        />
      </summary>

      <div
        className={cn(
          'mt-3 grid grid-cols-1 gap-2.5',
          compact ? 'sm:grid-cols-1' : 'sm:grid-cols-2',
        )}
      >
        {items.map((item) => {
          const Icon = item.icon ? ICONS[item.icon] : CircleHelp
          const wide = Boolean(item.chips)
          const chipCols =
            item.chips && item.chips.length <= 2
              ? 'grid-cols-2'
              : 'grid-cols-2 lg:grid-cols-5'
          return (
            <article
              key={item.question}
              className={cn(
                'rounded-[var(--radius-card)] border border-zinc-100 bg-surface p-3.5 shadow-sm sm:p-4',
                !compact && wide && 'sm:col-span-2',
              )}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-900">{item.question}</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600">{item.answer}</p>
                </div>
              </div>
              {item.chips && item.chips.length > 0 && (
                <ul className={cn('mt-3 grid gap-2', chipCols)}>
                  {item.chips.map((chip) => (
                    <li
                      key={chip.label}
                      className="flex flex-col gap-1 rounded-xl bg-zinc-50 px-2.5 py-2"
                    >
                      <Badge tone={chip.tone ?? 'neutral'}>{chip.label}</Badge>
                      <span className="text-xs leading-snug text-zinc-500">{chip.hint}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )
        })}
      </div>
    </details>
  )
}
