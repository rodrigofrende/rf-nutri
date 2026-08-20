import { ClipboardCheck } from 'lucide-react'
import type { CheckIn } from '@/types'
import { useCheckIns } from '@/hooks/useCheckIns'
import { Card, CardBody, EmptyState, Spinner } from '@/components/ui'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/format'
import { PageHelp } from '@/components/shared/PageHelp'
import { FICHA_CHECKIN_HELP } from '@/content/help'

type MetricKey = 'energy' | 'sleep' | 'hunger' | 'adherence'

const METRICS: { key: MetricKey; label: string; emoji: string }[] = [
  { key: 'energy', label: 'Energía', emoji: '⚡' },
  { key: 'sleep', label: 'Sueño', emoji: '😴' },
  { key: 'hunger', label: 'Hambre / antojos', emoji: '🍫' },
  { key: 'adherence', label: 'Adherencia', emoji: '✅' },
]

const METRIC_BAR_COLORS: Record<MetricKey, string> = {
  energy: 'bg-amber-400',
  sleep: 'bg-violet-400',
  hunger: 'bg-rose-400',
  adherence: 'bg-emerald-500',
}

function weekLabel(weekKey: string): string {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekKey)
  if (!m) return weekKey
  return `Semana ${Number(m[2])} · ${m[1]}`
}

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
          <span className="w-6 shrink-0 text-right text-xs font-semibold text-zinc-700">{checkIn[m.key]}</span>
        </div>
      ))}
    </div>
  )
}

export function CheckInsTab({ clinicId, memberId }: { clinicId: string; memberId: string }) {
  const { data: checkIns = [], isLoading } = useCheckIns(clinicId, memberId)

  if (isLoading) return <Spinner />

  if (checkIns.length === 0) {
    return (
      <div className="space-y-4">
        <PageHelp items={FICHA_CHECKIN_HELP} title="Cómo funcionan los check-ins" compact />
        <EmptyState
          icon={ClipboardCheck}
          title="Sin check-ins"
          description="Cuando el paciente complete su check-in semanal, vas a poder comparar semana a semana."
        />
      </div>
    )
  }

  const [latest, previous, ...rest] = checkIns

  return (
    <div className="space-y-4">
      <PageHelp items={FICHA_CHECKIN_HELP} title="Cómo funcionan los check-ins" compact />
      {previous && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardBody className="space-y-3 p-4">
              <p className="text-sm font-semibold text-zinc-900">Último · {weekLabel(latest.weekKey)}</p>
              <CheckInBars checkIn={latest} />
              {latest.comment && <p className="text-sm text-zinc-600">“{latest.comment}”</p>}
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-3 p-4">
              <p className="text-sm font-semibold text-zinc-900">Anterior · {weekLabel(previous.weekKey)}</p>
              <CheckInBars checkIn={previous} />
              {previous.comment && <p className="text-sm text-zinc-600">“{previous.comment}”</p>}
            </CardBody>
          </Card>
        </div>
      )}

      {!previous && (
        <Card>
          <CardBody className="space-y-3 p-4">
            <p className="text-sm font-semibold text-zinc-900">{weekLabel(latest.weekKey)}</p>
            <p className="text-xs text-zinc-400">{formatDate(latest.date)}</p>
            <CheckInBars checkIn={latest} />
            {latest.comment && <p className="text-sm text-zinc-600">“{latest.comment}”</p>}
          </CardBody>
        </Card>
      )}

      {(previous ? rest : checkIns.slice(1)).length > 0 && (
        <div className="space-y-3">
          {(previous ? rest : checkIns.slice(1)).map((c) => (
            <Card key={c.id}>
              <CardBody className="space-y-3 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-800">{weekLabel(c.weekKey)}</p>
                  <p className="text-xs text-zinc-400">{formatDate(c.date)}</p>
                </div>
                <CheckInBars checkIn={c} />
                {c.comment && <p className="text-sm text-zinc-600">“{c.comment}”</p>}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
