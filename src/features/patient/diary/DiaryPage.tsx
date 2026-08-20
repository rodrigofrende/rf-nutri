import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Scale, X } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts'
import type { MealAdherence, MealDiaryEntry, MealSlot } from '@/types'
import { DEFAULT_CLINIC_SETTINGS } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useClinic } from '@/hooks/useClinic'
import { useDiaryEntries, useSaveDiaryEntry, useSaveWeightLog, useWeightLogs } from '@/hooks/useDiary'
import { useToastAction } from '@/hooks/useToastAction'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardBody, FullPageSpinner, Heading } from '@/components/ui'
import { cn } from '@/utils/cn'
import { addDays, lastNDayKeys, parseDayKey, toDayKey, todayKey } from '@/utils/dateKeys'
import { MEAL_SLOTS, MEAL_SLOT_LABELS } from '@/utils/nutrition'
import { LogMealModal } from './LogMealModal'
import { DIARY_HELP } from '@/content/help'
import { WeightEntryModal } from './WeightEntryModal'

const WEEKDAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

/** Meta visual de cada estado de comida (espeja los botones del modal). */
const STATUS_META: Record<MealAdherence, { label: string; chip: string; icon: 'check' | 'tilde' | 'x' }> = {
  done: { label: 'Cumplida', chip: 'bg-emerald-100 text-emerald-700', icon: 'check' },
  partial: { label: 'A medias', chip: 'bg-amber-100 text-amber-700', icon: 'tilde' },
  skipped: { label: 'No pude', chip: 'bg-red-100 text-red-700', icon: 'x' },
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

/** Adherencia 0..1 del día: cumplida=1, a medias=0.5, no pude=0. Sin registros → null. */
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

/** "lunes 18 de agosto" para el encabezado del día activo. */
function longDayLabel(dayKey: string): string {
  const date = parseDayKey(dayKey)
  if (!date) return dayKey
  return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
}

export function DiaryPage() {
  const { activeClinicId, activeMembership } = useTenant()
  const clinicId = activeClinicId as string
  const memberId = activeMembership?.memberId as string
  const run = useToastAction()

  const { data: clinic } = useClinic(clinicId)
  const settings = clinic?.settings ?? DEFAULT_CLINIC_SETTINGS

  const today = todayKey()
  const [activeDay, setActiveDay] = useState(today)
  const weekKeys = useMemo(() => lastNDayKeys(7), [])

  // Un solo rango cubre la tira semanal Y el día activo (aunque el paciente
  // navegue más atrás de los 7 días): así no duplicamos queries.
  const fromKey = activeDay < weekKeys[0] ? activeDay : weekKeys[0]
  const { data: entries = [], isLoading } = useDiaryEntries(clinicId, memberId, fromKey, today)
  const { data: weightLogs = [] } = useWeightLogs(clinicId, memberId)

  const saveEntry = useSaveDiaryEntry(clinicId, memberId)
  const saveWeight = useSaveWeightLog(clinicId, memberId)

  const [activeSlot, setActiveSlot] = useState<MealSlot | null>(null)
  const [weightOpen, setWeightOpen] = useState(false)

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

  const goDays = (delta: number) => {
    const date = parseDayKey(activeDay)
    if (!date) return
    const next = toDayKey(addDays(date, delta))
    // El diario registra lo que YA pasó: el futuro queda bloqueado.
    if (next > today) return
    setActiveDay(next)
  }

  const todayWeight = weightLogs.find((w) => w.dayKey === today)
  // Sparkline de los últimos 30 días: solo los días con registro, en orden.
  const sparkData = useMemo(() => {
    const cutoff = lastNDayKeys(30)[0]
    return weightLogs
      .filter((w) => w.dayKey >= cutoff)
      .map((w) => ({ dayKey: w.dayKey, value: w.weightKg }))
  }, [weightLogs])

  const saveMeal = async (data: { status: MealAdherence; note?: string; photoURL?: string }) => {
    if (!activeSlot) return
    const ok = await run(
      () => saveEntry.mutateAsync({ dayKey: activeDay, slot: activeSlot, ...data }),
      { success: 'Comida registrada', error: 'No se pudo guardar el registro' },
    )
    if (ok) setActiveSlot(null)
  }

  const saveWeightEntry = async (data: { weightKg: number; note?: string }) => {
    const ok = await run(
      () => saveWeight.mutateAsync({ dayKey: today, ...data }),
      { success: 'Peso registrado', error: 'No se pudo guardar el peso' },
    )
    if (ok) setWeightOpen(false)
  }

  if (isLoading) {
    return (
      <AppLayout title="Mi diario">
        <FullPageSpinner />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Mi diario" subtitle="Registrá cómo te fue con cada comida." help={DIARY_HELP} helpTitle="Cómo funciona el diario">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* Tira semanal: adherencia de los últimos 7 días de un vistazo */}
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

        {/* Navegación del día activo (sin futuro: no hay nada para registrar ahí) */}
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
            {activeDay === today && <p className="text-xs text-brand-600">Hoy</p>}
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

        {/* Las 6 comidas del día: una fila = un tap = un registro */}
        <Card>
          <div className="divide-y divide-zinc-100">
            {MEAL_SLOTS.map((slot) => {
              const entry = entryBySlot.get(slot)
              const meta = entry ? STATUS_META[entry.status] : null
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setActiveSlot(slot)}
                  className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:bg-brand-50/60 sm:px-5"
                >
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-full',
                      meta ? meta.chip : 'bg-zinc-100 text-zinc-400',
                    )}
                  >
                    {meta ? <StatusGlyph icon={meta.icon} className="size-5" /> : <Plus className="size-5" aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-900">
                      {MEAL_SLOT_LABELS[slot]}
                    </span>
                    <span className={cn('block text-xs', meta ? 'text-zinc-500' : 'text-zinc-400')}>
                      {meta ? meta.label : 'Sin registrar'}
                      {entry?.note ? ` · ${entry.note}` : ''}
                    </span>
                  </span>
                  {entry?.photoURL && (
                    <img
                      src={entry.photoURL}
                      alt=""
                      aria-hidden
                      className="size-10 shrink-0 rounded-lg border border-zinc-200 object-cover"
                    />
                  )}
                  <Pencil className="size-4 shrink-0 text-zinc-300" aria-hidden />
                </button>
              )
            })}
          </div>
        </Card>

        {/* Mi peso: registro de hoy + tendencia de 30 días */}
        <Card>
          <CardBody className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Scale className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <Heading variant="card" as="h2">
                  Mi peso
                </Heading>
                <p className="text-xs text-zinc-500">
                  {todayWeight
                    ? `Hoy: ${todayWeight.weightKg.toLocaleString('es-AR')} kg`
                    : 'Todavía no registraste tu peso de hoy'}
                </p>
              </div>
              <Button
                variant={todayWeight ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => setWeightOpen(true)}
              >
                {todayWeight ? 'Editar' : 'Registrar'}
              </Button>
            </div>
            {sparkData.length >= 2 && (
              <div className="mt-3">
                <div className="h-14">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparkData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                      {/* Dominio ajustado: en un sparkline lo que importa es la forma */}
                      <YAxis hide domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="var(--color-brand-600)"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-1 text-right text-[10px] text-zinc-400">Últimos 30 días</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {activeSlot && (
        <LogMealModal
          // key: remonta el modal por comida/día para que el estado precargado sea el correcto
          key={`${activeDay}_${activeSlot}`}
          open
          onClose={() => setActiveSlot(null)}
          slot={activeSlot}
          photosEnabled={settings.diaryPhotosEnabled}
          existing={entryBySlot.get(activeSlot)}
          onSave={(data) => void saveMeal(data)}
          saving={saveEntry.isPending}
        />
      )}

      {weightOpen && (
        <WeightEntryModal
          key={todayWeight ? `edit-${todayWeight.weightKg}` : 'new'}
          open
          onClose={() => setWeightOpen(false)}
          existing={todayWeight}
          onSave={(data) => void saveWeightEntry(data)}
          saving={saveWeight.isPending}
        />
      )}
    </AppLayout>
  )
}
