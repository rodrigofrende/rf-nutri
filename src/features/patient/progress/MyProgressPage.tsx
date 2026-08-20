import { useMemo, useState, type ReactNode } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { LineChart as LineChartIcon, Ruler, Scale, TrendingDown, TrendingUp } from 'lucide-react'
import type { BodyFatFormula, Perimeters } from '@/types'
import { DEFAULT_CLINIC_SETTINGS } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useClinic } from '@/hooks/useClinic'
import { useMember } from '@/hooks/useMembers'
import { useAnthropometry } from '@/hooks/useAnthropometry'
import { useWeightLogs } from '@/hooks/useDiary'
import { useCheckIns } from '@/hooks/useCheckIns'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardBody, CardHeader, EmptyState, FullPageSpinner, Select, StatCard } from '@/components/ui'
import { ageAt, bmi, bmiCategory, BMI_CATEGORY_LABELS, deriveAnthropometry } from '@/utils/anthropometry'
import { toDayKey } from '@/utils/dateKeys'
import { toDate } from '@/utils/format'

/** 'YYYY-MM-DD' → 'd/M' para ejes compactos. */
function shortDay(dayKey: string): string {
  const [, m, d] = dayKey.split('-')
  return `${Number(d)}/${Number(m)}`
}

const PERIMETER_OPTIONS: { value: keyof Perimeters; label: string }[] = [
  { value: 'waist', label: 'Cintura' },
  { value: 'hip', label: 'Cadera' },
  { value: 'arm', label: 'Brazo' },
  { value: 'thigh', label: 'Muslo' },
  { value: 'calf', label: 'Pierna' },
  { value: 'neck', label: 'Cuello' },
]

const BODY_FAT_FORMULA_LABELS: Record<BodyFatFormula, string> = {
  durnin: 'Durnin-Womersley',
  faulkner: 'Faulkner',
}

/** Series del check-in con colores propios (consistentes con la página de check-in). */
const CHECKIN_SERIES = [
  { key: 'energy', label: 'Energía', color: '#f59e0b' },
  { key: 'sleep', label: 'Sueño', color: '#8b5cf6' },
  { key: 'hunger', label: 'Hambre', color: '#f43f5e' },
  { key: 'adherence', label: 'Adherencia', color: '#10b981' },
] as const

const AXIS_PROPS = { tickLine: false, axisLine: false, fontSize: 11, stroke: '#a1a1aa' } as const

function ChartCard({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} action={action} />
      <CardBody className="p-3 sm:p-5">{children}</CardBody>
    </Card>
  )
}

export function MyProgressPage() {
  const { activeClinicId, activeMembership } = useTenant()
  const clinicId = activeClinicId as string
  const memberId = activeMembership?.memberId as string

  const { data: clinic } = useClinic(clinicId)
  const settings = clinic?.settings ?? DEFAULT_CLINIC_SETTINGS
  const { data: member, isLoading: loadingMember } = useMember(clinicId, memberId)
  const { data: weightLogs = [], isLoading: loadingWeights } = useWeightLogs(clinicId, memberId)
  const { data: anthro = [], isLoading: loadingAnthro } = useAnthropometry(clinicId, memberId)
  const { data: checkIns = [] } = useCheckIns(clinicId, memberId)

  const [perimeter, setPerimeter] = useState<keyof Perimeters>('waist')

  const birthDate = toDate(member?.birthDate)

  // Registros del consultorio ordenados por fecha ascendente (la query no garantiza orden).
  const anthroAsc = useMemo(
    () =>
      [...anthro]
        .map((r) => ({ record: r, date: toDate(r.date) }))
        .filter((r): r is { record: (typeof anthro)[number]; date: Date } => !!r.date)
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [anthro],
  )

  // Peso: dos series (autorreportado + consultorio) fusionadas por dayKey para
  // graficarlas en el mismo eje aunque caigan en fechas distintas.
  const weightData = useMemo(() => {
    const byDay = new Map<string, { dayKey: string; auto?: number; consultorio?: number }>()
    for (const w of weightLogs) {
      byDay.set(w.dayKey, { ...byDay.get(w.dayKey), dayKey: w.dayKey, auto: w.weightKg })
    }
    for (const { record, date } of anthroAsc) {
      const key = toDayKey(date)
      byDay.set(key, { ...byDay.get(key), dayKey: key, consultorio: record.weightKg })
    }
    return [...byDay.values()].sort((a, b) => a.dayKey.localeCompare(b.dayKey))
  }, [weightLogs, anthroAsc])

  // Resumen: actual vs inicial tomando TODOS los puntos de peso (propios + consultorio).
  const weightPoints = useMemo(
    () => weightData.flatMap((d) => [d.auto, d.consultorio].filter((v): v is number => v != null).map((v) => ({ dayKey: d.dayKey, value: v }))),
    [weightData],
  )
  const firstWeight = weightPoints[0]?.value
  const lastWeight = weightPoints[weightPoints.length - 1]?.value
  const weightDelta = firstWeight != null && lastWeight != null ? lastWeight - firstWeight : null

  // IMC actual con el último peso disponible y la talla más confiable que haya
  // (la del último registro del consultorio o la ficha del member).
  const heightCm = anthroAsc.length > 0 ? (anthroAsc[anthroAsc.length - 1].record.heightCm ?? member?.heightCm) : member?.heightCm
  const currentBmi = settings.anthropometry.showBmi && lastWeight != null && heightCm ? bmi(lastWeight, heightCm) : null

  // % de grasa: derivado por registro con la edad A LA FECHA de cada medición
  // y la primera fórmula configurada por el consultorio.
  const formula = settings.anthropometry.bodyFatFormulas[0]
  const bodyFatData = useMemo(() => {
    if (!settings.anthropometry.skinfolds || !formula) return []
    return anthroAsc
      .filter(({ record }) => record.skinfolds)
      .map(({ record, date }) => {
        const derived = deriveAnthropometry(record, {
          sex: member?.sex,
          ageYears: birthDate ? ageAt(birthDate, date) : undefined,
          activityLevel: member?.activityLevel,
          fallbackHeightCm: member?.heightCm,
        })
        const value = formula === 'durnin' ? derived.bodyFatDurnin : derived.bodyFatFaulkner
        return value == null ? null : { dayKey: toDayKey(date), value: Math.round(value * 10) / 10 }
      })
      .filter((p): p is { dayKey: string; value: number } => p != null)
  }, [anthroAsc, settings.anthropometry.skinfolds, formula, member, birthDate])

  // Perímetros disponibles: solo ofrecemos los que tienen al menos un dato.
  const perimeterData = useMemo(
    () =>
      anthroAsc
        .map(({ record, date }) => {
          const value = record.perimeters?.[perimeter]
          return value == null ? null : { dayKey: toDayKey(date), value }
        })
        .filter((p): p is { dayKey: string; value: number } => p != null),
    [anthroAsc, perimeter],
  )

  // Check-ins: últimas 12 semanas en orden cronológico (vienen desc de Firestore).
  const checkInData = useMemo(
    () =>
      [...checkIns]
        .sort((a, b) => a.weekKey.localeCompare(b.weekKey))
        .slice(-12)
        .map((c) => ({
          label: `S${Number(c.weekKey.slice(-2))}`,
          energy: c.energy,
          sleep: c.sleep,
          hunger: c.hunger,
          adherence: c.adherence,
        })),
    [checkIns],
  )

  if (loadingMember || loadingWeights || loadingAnthro) {
    return (
      <AppLayout title="Mi progreso">
        <FullPageSpinner />
      </AppLayout>
    )
  }

  const hasAnything = weightPoints.length > 0 || bodyFatData.length > 0 || checkInData.length > 0

  return (
    <AppLayout title="Mi progreso" subtitle="Tu evolución, medida y a la vista.">
      {!hasAnything ? (
        <EmptyState
          icon={LineChartIcon}
          title="Todavía no hay datos para graficar"
          description="Registrá tu peso en el diario o esperá tu próxima medición en el consultorio: acá vas a ver tu evolución."
        />
      ) : (
        <div className="space-y-4">
          {/* Resumen arriba: lo esencial sin leer gráficos */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lastWeight != null && (
              <StatCard
                icon={Scale}
                label="Peso actual"
                value={`${lastWeight.toLocaleString('es-AR')} kg`}
                hint={firstWeight != null ? `Inicial: ${firstWeight.toLocaleString('es-AR')} kg` : undefined}
              />
            )}
            {weightDelta != null && weightPoints.length > 1 && (
              <StatCard
                icon={weightDelta <= 0 ? TrendingDown : TrendingUp}
                label="Cambio total"
                value={`${weightDelta > 0 ? '+' : ''}${(Math.round(weightDelta * 10) / 10).toLocaleString('es-AR')} kg`}
                tone={weightDelta <= 0 ? 'green' : 'amber'}
              />
            )}
            {currentBmi != null && (
              <StatCard
                icon={Ruler}
                label="IMC actual"
                value={(Math.round(currentBmi * 10) / 10).toLocaleString('es-AR')}
                hint={BMI_CATEGORY_LABELS[bmiCategory(currentBmi)]}
              />
            )}
          </div>

          {weightData.length > 0 && (
            <ChartCard title="Peso" subtitle="Lo que registrás vos y lo que mide tu nutricionista">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={weightData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis dataKey="dayKey" tickFormatter={shortDay} {...AXIS_PROPS} />
                  <YAxis domain={['auto', 'auto']} width={36} {...AXIS_PROPS} />
                  <Tooltip
                    labelFormatter={(l) => shortDay(String(l))}
                    formatter={(v) => [`${Number(v).toLocaleString('es-AR')} kg`]}
                  />
                  <Legend iconType="circle" />
                  {member?.targetWeightKg ? (
                    <ReferenceLine
                      y={member.targetWeightKg}
                      stroke="#10b981"
                      strokeDasharray="6 4"
                      label={{ value: `Meta ${member.targetWeightKg} kg`, position: 'insideTopRight', fontSize: 11, fill: '#059669' }}
                    />
                  ) : null}
                  <Line
                    type="monotone"
                    dataKey="auto"
                    name="Autorreportado"
                    stroke="var(--color-brand-600)"
                    strokeWidth={2}
                    dot={{ r: 2.5 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="consultorio"
                    name="Consultorio"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {settings.anthropometry.skinfolds && bodyFatData.length > 0 && formula && (
            <ChartCard title="% de grasa corporal" subtitle={`Fórmula: ${BODY_FAT_FORMULA_LABELS[formula]}`}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={bodyFatData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis dataKey="dayKey" tickFormatter={shortDay} {...AXIS_PROPS} />
                  <YAxis domain={['auto', 'auto']} width={36} {...AXIS_PROPS} />
                  <Tooltip labelFormatter={(l) => shortDay(String(l))} formatter={(v) => [`${v}%`, '% grasa']} />
                  <Line type="monotone" dataKey="value" name="% grasa" stroke="var(--color-brand-600)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {settings.anthropometry.perimeters && anthroAsc.length > 0 && (
            <ChartCard
              title="Perímetros"
              subtitle="Medidos en el consultorio (cm)"
              action={
                <Select
                  aria-label="Elegir perímetro"
                  value={perimeter}
                  onChange={(e) => setPerimeter(e.target.value as keyof Perimeters)}
                  options={PERIMETER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  className="w-36"
                />
              }
            >
              {perimeterData.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-400">
                  Todavía no hay mediciones de este perímetro.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={perimeterData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                    <XAxis dataKey="dayKey" tickFormatter={shortDay} {...AXIS_PROPS} />
                    <YAxis domain={['auto', 'auto']} width={36} {...AXIS_PROPS} />
                    <Tooltip
                      labelFormatter={(l) => shortDay(String(l))}
                      formatter={(v) => [`${Number(v).toLocaleString('es-AR')} cm`, PERIMETER_OPTIONS.find((o) => o.value === perimeter)?.label]}
                    />
                    <Line type="monotone" dataKey="value" stroke="var(--color-brand-600)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          )}

          {checkInData.length > 0 && (
            <ChartCard title="Check-ins" subtitle="Tus últimas 12 semanas (1-10)">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={checkInData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis dataKey="label" {...AXIS_PROPS} />
                  <YAxis domain={[0, 10]} width={24} {...AXIS_PROPS} />
                  <Tooltip />
                  <Legend iconType="circle" />
                  {CHECKIN_SERIES.map((s) => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.label}
                      stroke={s.color}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}
    </AppLayout>
  )
}
