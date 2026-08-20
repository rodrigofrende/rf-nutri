import { useMemo, useState } from 'react'
import { BookOpen, Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { MealAdherence, MealDiaryEntry } from '@/types'
import { useDiaryEntries, useWeightLogs } from '@/hooks/useDiary'
import { Card, CardBody, EmptyState, Spinner } from '@/components/ui'
import { cn } from '@/utils/cn'
import { addDays, lastNDayKeys, parseDayKey, toDayKey, todayKey } from '@/utils/dateKeys'
import { MEAL_SLOTS, MEAL_SLOT_LABELS } from '@/utils/nutrition'

const WEEKDAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

const STATUS_META: Record<MealAdherence, { label: string; chip: string; icon: 'check' | 'tilde' | 'x' }> = {
  done: { label: 'Cumplida', chip: 'bg-emerald-100 text-emerald-700', icon: 'check' },
  partial: { label: 'A medias', chip: 'bg-amber-100 text-amber-700', icon: 'tilde' },
  skipped: { label: 'No pudo', chip: 'bg-red-100 text-red-700', icon: 'x' },
}

function StatusGlyph({ icon, className }: { icon: 'check' | 'tilde' | 'x'; className?: string }) {
  if (icon === 'check') return <Check className={className} aria-hidden />
  if (icon === 'x') return <X className={className} aria-hidden />
  return (
    <span className={cn('inline-flex items-center justify-center text-base font-bold leading-none', className)} aria-hidden>
      ~
    </span>
  )
}

function dayAdherence(entries: MealDiaryEntry[]): number | null {
  if (entries.length === 0) return null
  const score = entries.reduce(
    (acc, e) => acc + (e.status === 'done' ? 1 : e.status === 'partial' ? 0.5 : 0),
    0,
  )
  return score / entries.length
}

function adherenceDotClass(pct: number | null): string {
  if (pct == null) return 'bg-zinc-200'
  if (pct >= 0.75) return 'bg-emerald-500'
  if (pct >= 0.4) return 'bg-amber-400'
  return 'bg-red-400'
}

function longDayLabel(dayKey: string): string {
  const date = parseDayKey(dayKey)
  if (!date) return dayKey
  return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
}

export function DiaryTab({ clinicId, memberId }: { clinicId: string; memberId: string }) {
  const today = todayKey()
  const [activeDay, setActiveDay] = useState(today)
  const weekKeys = useMemo(() => lastNDayKeys(7), [])
  const fromKey = activeDay < weekKeys[0] ? activeDay : weekKeys[0]
  const { data: entries = [], isLoading } = useDiaryEntries(clinicId, memberId, fromKey, today)
  const { data: weightLogs = [] } = useWeightLogs(clinicId, memberId)

  const entriesByDay = useMemo(() => {
    const map = new Map<string, MealDiaryEntry[]>()
    for (const e of entries) {
      const list = map.get(e.dayKey)
      if (list) list.push(e)
      else map.set(e.dayKey, [e])
    }
    return map
  }, [entries])

  const dayEntries = entriesByDay.get(activeDay) ?? []
  const entryBySlot = new Map(dayEntries.map((e) => [e.slot, e]))
  const dayWeight = weightLogs.find((w) => w.dayKey === activeDay)

  const goDays = (delta: number) => {
    const date = parseDayKey(activeDay)
    if (!date) return
    const next = toDayKey(addDays(date, delta))
    if (next > today) return
    setActiveDay(next)
  }

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="p-3 sm:p-4">
          <div className="grid grid-cols-7 gap-1">
            {weekKeys.map((key) => {
              const date = parseDayKey(key)
              const pct = dayAdherence(entriesByDay.get(key) ?? [])
              const isActive = key === activeDay
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveDay(key)}
                  aria-label={`Ver el ${longDayLabel(key)}`}
                  aria-pressed={isActive}
                  className={cn(
                    'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl py-1.5 transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                    isActive ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-zinc-50',
                  )}
                >
                  <span className="text-[10px] font-medium uppercase text-zinc-400">
                    {date ? WEEKDAY_LETTERS[date.getDay()] : ''}
                  </span>
                  <span className={cn('text-sm font-semibold', isActive ? 'text-brand-700' : 'text-zinc-700')}>
                    {date?.getDate()}
                  </span>
                  <span className={cn('size-2 rounded-full', adherenceDotClass(pct))} aria-hidden />
                </button>
              )
            })}
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goDays(-1)}
          aria-label="Día anterior"
          className="flex size-11 items-center justify-center rounded-full border border-zinc-200 bg-surface text-zinc-500 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-semibold capitalize text-zinc-900">{longDayLabel(activeDay)}</p>
          {dayWeight && (
            <p className="text-xs text-zinc-500">Peso: {dayWeight.weightKg.toLocaleString('es-AR')} kg</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => goDays(1)}
          disabled={activeDay >= today}
          aria-label="Día siguiente"
          className="flex size-11 items-center justify-center rounded-full border border-zinc-200 bg-surface text-zinc-500 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {dayEntries.length === 0 && !dayWeight ? (
        <EmptyState
          icon={BookOpen}
          title="Sin registros este día"
          description="Cuando el paciente cargue su diario, vas a ver acá cada comida y las fotos."
        />
      ) : (
        <Card>
          <div className="divide-y divide-zinc-100">
            {MEAL_SLOTS.map((slot) => {
              const entry = entryBySlot.get(slot)
              const meta = entry ? STATUS_META[entry.status] : null
              return (
                <div key={slot} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                  <span
                    className={cn(
                      'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full',
                      meta ? meta.chip : 'bg-zinc-100 text-zinc-400',
                    )}
                  >
                    {meta ? <StatusGlyph icon={meta.icon} className="size-5" /> : <span className="text-xs">—</span>}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900">{MEAL_SLOT_LABELS[slot]}</p>
                    <p className={cn('text-xs', meta ? 'text-zinc-500' : 'text-zinc-400')}>
                      {meta ? meta.label : 'Sin registrar'}
                      {entry?.note ? ` · ${entry.note}` : ''}
                    </p>
                  </div>
                  {entry?.photoURL && (
                    <img
                      src={entry.photoURL}
                      alt={`Foto de ${MEAL_SLOT_LABELS[slot]}`}
                      className="size-14 shrink-0 rounded-lg border border-zinc-200 object-cover"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
