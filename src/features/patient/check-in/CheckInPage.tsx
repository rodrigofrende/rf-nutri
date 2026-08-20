import { useEffect, useState } from 'react'
import { ClipboardCheck, Minus, Plus } from 'lucide-react'
import type { CheckIn } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useCheckIns, useSaveCheckIn } from '@/hooks/useCheckIns'
import { useToastAction } from '@/hooks/useToastAction'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Card, CardBody, EmptyState, FullPageSpinner, Heading, Textarea } from '@/components/ui'
import { cn } from '@/utils/cn'
import { currentWeekKey } from '@/utils/dateKeys'
import { formatDate } from '@/utils/format'

const COMMENT_MAX = 1000

type MetricKey = 'energy' | 'sleep' | 'hunger' | 'adherence'

/** Las 4 métricas del check-in, con emoji sutil para escanear rápido en mobile. */
const METRICS: { key: MetricKey; label: string; emoji: string; low: string; high: string }[] = [
  { key: 'energy', label: 'Energía', emoji: '⚡', low: 'Agotado/a', high: 'A full' },
  { key: 'sleep', label: 'Sueño', emoji: '😴', low: 'Dormí mal', high: 'Dormí genial' },
  { key: 'hunger', label: 'Hambre / antojos', emoji: '🍫', low: 'Sin antojos', high: 'Muchos antojos' },
  { key: 'adherence', label: 'Adherencia al plan', emoji: '✅', low: 'Me costó', high: 'Lo seguí' },
]

const METRIC_BAR_COLORS: Record<MetricKey, string> = {
  energy: 'bg-amber-400',
  sleep: 'bg-violet-400',
  hunger: 'bg-rose-400',
  adherence: 'bg-emerald-500',
}

type FormValues = Record<MetricKey, number>

// 5 como punto de partida neutro: obliga menos a "corregir" que arrancar en 1.
const DEFAULT_VALUES: FormValues = { energy: 5, sleep: 5, hunger: 5, adherence: 5 }

/** "2026-W34" → "Semana 34 · 2026" (etiqueta humana del weekKey ISO). */
function weekLabel(weekKey: string): string {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekKey)
  if (!m) return weekKey
  return `Semana ${Number(m[2])} · ${m[1]}`
}

/** Escala 1-10 accesible: slider + botones -/+ grandes (tap targets de verdad). */
function ScaleField({
  label,
  emoji,
  low,
  high,
  value,
  onChange,
}: {
  label: string
  emoji: string
  low: string
  high: string
  value: number
  onChange: (v: number) => void
}) {
  const step = (delta: number) => onChange(Math.min(10, Math.max(1, value + delta)))
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700">
          <span aria-hidden>{emoji}</span> {label}
        </span>
        <span className="text-lg font-bold text-brand-700">{value}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={value <= 1}
          aria-label={`Bajar ${label}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-surface text-zinc-600 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="size-5" aria-hidden />
        </button>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={`${label}: ${value} de 10`}
          className="h-2 w-full cursor-pointer accent-brand-600"
        />
        <button
          type="button"
          onClick={() => step(1)}
          disabled={value >= 10}
          aria-label={`Subir ${label}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-surface text-zinc-600 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-5" aria-hidden />
        </button>
      </div>
      <div className="mt-1 flex justify-between px-14 text-[10px] text-zinc-400">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  )
}

/** Barras de las 4 métricas de un check-in guardado (historial). */
function CheckInBars({ checkIn }: { checkIn: CheckIn }) {
  return (
    <div className="space-y-2">
      {METRICS.map((m) => (
        <div key={m.key} className="flex items-center gap-2">
          <span className="w-36 shrink-0 truncate text-xs text-zinc-500">
            <span aria-hidden>{m.emoji}</span> {m.label}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
            <div
              className={cn('h-full rounded-full', METRIC_BAR_COLORS[m.key])}
              style={{ width: `${(checkIn[m.key] / 10) * 100}%` }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-xs font-semibold text-zinc-700">
            {checkIn[m.key]}
          </span>
        </div>
      ))}
    </div>
  )
}

export function CheckInPage() {
  const { activeClinicId, activeMembership } = useTenant()
  const clinicId = activeClinicId as string
  const memberId = activeMembership?.memberId as string
  const run = useToastAction()

  const weekKey = currentWeekKey()
  const { data: checkIns = [], isLoading } = useCheckIns(clinicId, memberId)
  const saveCheckIn = useSaveCheckIn(clinicId, memberId)

  const existing = checkIns.find((c) => c.weekKey === weekKey)
  const history = checkIns.filter((c) => c.weekKey !== weekKey)

  const [values, setValues] = useState<FormValues>(DEFAULT_VALUES)
  const [comment, setComment] = useState('')
  // Precarga el check-in de la semana cuando llega de Firestore (upsert editable).
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  useEffect(() => {
    if (!existing || loadedKey === existing.id) return
    setValues({
      energy: existing.energy,
      sleep: existing.sleep,
      hunger: existing.hunger,
      adherence: existing.adherence,
    })
    setComment(existing.comment ?? '')
    setLoadedKey(existing.id)
  }, [existing, loadedKey])

  const submit = () =>
    run(
      () =>
        saveCheckIn.mutateAsync({
          weekKey,
          ...values,
          comment: comment.trim() || undefined,
        }),
      {
        success: existing ? 'Check-in actualizado' : 'Check-in guardado. ¡Buena semana!',
        error: 'No se pudo guardar el check-in',
      },
    )

  if (isLoading) {
    return (
      <AppLayout title="Check-in semanal">
        <FullPageSpinner />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Check-in semanal" subtitle="Un minuto por semana para contarle a tu nutri cómo venís.">
      <div className="mx-auto max-w-2xl space-y-5">
        <Card>
          <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-4 py-3 sm:px-5">
            <Heading variant="card" as="h2">
              {weekLabel(weekKey)}
            </Heading>
            {existing && <Badge tone="green">Ya lo hiciste</Badge>}
          </div>
          <CardBody className="space-y-5 p-4 sm:p-5">
            {existing && (
              <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">
                Podés ajustarlo hasta el domingo.
              </p>
            )}
            {METRICS.map((m) => (
              <ScaleField
                key={m.key}
                label={m.label}
                emoji={m.emoji}
                low={m.low}
                high={m.high}
                value={values[m.key]}
                onChange={(v) => setValues((prev) => ({ ...prev, [m.key]: v }))}
              />
            ))}
            <div>
              <label htmlFor="checkin-comment" className="mb-1.5 block text-sm font-medium text-zinc-700">
                Comentario <span className="font-normal text-zinc-400">(opcional)</span>
              </label>
              <Textarea
                id="checkin-comment"
                rows={3}
                maxLength={COMMENT_MAX}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="¿Qué te costó? ¿Qué salió bien?"
              />
            </div>
            <Button fullWidth size="lg" loading={saveCheckIn.isPending} onClick={() => void submit()}>
              {existing ? 'Actualizar check-in' : 'Guardar check-in'}
            </Button>
          </CardBody>
        </Card>

        <div className="space-y-3">
          <Heading variant="card" as="h2">
            Semanas anteriores
          </Heading>
          {history.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Todavía no hay check-ins anteriores"
              description="Cada semana que completes el check-in va a quedar guardada acá."
            />
          ) : (
            history.map((c) => (
              <Card key={c.id}>
                <CardBody className="space-y-3 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-900">{weekLabel(c.weekKey)}</p>
                    <p className="text-xs text-zinc-400">{formatDate(c.date)}</p>
                  </div>
                  <CheckInBars checkIn={c} />
                  {c.comment && (
                    <p className="rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-600">{c.comment}</p>
                  )}
                </CardBody>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  )
}
