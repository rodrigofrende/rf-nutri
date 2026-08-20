import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Info, Pencil, Plus, Ruler, Trash2 } from 'lucide-react'
import type {
  AnthropometryRecord,
  BodyFatFormula,
  ClinicSettings,
  Member,
  Perimeters,
  Skinfolds,
} from '@/types'
import {
  useAnthropometry,
  useCreateAnthropometryRecord,
  useRemoveAnthropometryRecord,
  useUpdateAnthropometryRecord,
} from '@/hooks/useAnthropometry'
import { useToastAction } from '@/hooks/useToastAction'
import { useToast } from '@/providers/ToastProvider'
import {
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DateInput,
  EmptyState,
  FormField,
  IconButton,
  Input,
  Modal,
  Spinner,
  Text,
  Textarea,
} from '@/components/ui'
import {
  ageAt,
  BMI_CATEGORY_LABELS,
  deriveAnthropometry,
  type AnthropometryDerived,
  type DerivedContext,
} from '@/utils/anthropometry'
import { formatDate, toDate, toDateInput } from '@/utils/format'
import { parseDateInput, todayDateInput } from '@/utils/dates'
import { PageHelp } from '@/components/shared/PageHelp'
import { ANTHROPOMETRY_HELP } from '@/content/help'

const FAT_FORMULA_LABELS: Record<BodyFatFormula, string> = {
  durnin: 'Durnin-Womersley',
  faulkner: 'Faulkner',
}

const PERIMETER_FIELDS: { key: keyof Perimeters; label: string }[] = [
  { key: 'waist', label: 'Cintura' },
  { key: 'hip', label: 'Cadera' },
  { key: 'arm', label: 'Brazo' },
  { key: 'thigh', label: 'Muslo' },
  { key: 'calf', label: 'Pantorrilla' },
  { key: 'neck', label: 'Cuello' },
]

const SKINFOLD_FIELDS: { key: keyof Skinfolds; label: string }[] = [
  { key: 'triceps', label: 'Tríceps' },
  { key: 'subscapular', label: 'Subescapular' },
  { key: 'biceps', label: 'Bíceps' },
  { key: 'iliacCrest', label: 'Cresta ilíaca' },
  { key: 'supraspinale', label: 'Supraespinal' },
  { key: 'abdominal', label: 'Abdominal' },
  { key: 'thigh', label: 'Muslo' },
  { key: 'calf', label: 'Pantorrilla' },
]

// Qué pliegues necesita cada fórmula: se muestra como hint para que la medición
// que se carga alcance para calcular (cargar 3 de 4 pliegues = ningún resultado).
const FORMULA_HINTS: Record<BodyFatFormula, string> = {
  durnin: 'Durnin-Womersley: bíceps, tríceps, subescapular y cresta ilíaca',
  faulkner: 'Faulkner: tríceps, subescapular, supraespinal y abdominal',
}

interface RecordForm {
  date: string
  weightKg: string
  heightCm: string
  perimeters: Record<string, string>
  skinfolds: Record<string, string>
  notes: string
}

const emptyForm = (): RecordForm => ({
  date: todayDateInput(),
  weightKg: '',
  heightCm: '',
  perimeters: {},
  skinfolds: {},
  notes: '',
})

/** Parsea un número opcional ('' → undefined; acepta coma decimal). */
function num(value?: string): number | undefined {
  if (!value || !value.trim()) return undefined
  const n = Number(value.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : undefined
}

const f1 = (n: number | null | undefined, suffix = '') => (n == null ? '—' : `${n.toFixed(1)}${suffix}`)
const f2 = (n: number | null | undefined) => (n == null ? '—' : n.toFixed(2))
const f0 = (n: number | null | undefined, suffix = '') =>
  n == null ? '—' : `${Math.round(n)}${suffix}`

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-zinc-800">{value}</p>
      {hint && <p className="text-xs text-zinc-400">{hint}</p>}
    </div>
  )
}

/**
 * Mediciones antropométricas del paciente: se guardan SOLO valores crudos y
 * todos los derivados (IMC, % grasa, TMB, GET...) se calculan al mostrar con
 * el contexto del member (sexo, edad a la fecha de la medición, actividad).
 */
export function AnthropometryTab({
  clinicId,
  member,
  settings,
  adminUid,
}: {
  clinicId: string
  member: Member
  settings: ClinicSettings
  adminUid: string
}) {
  const run = useToastAction()
  const { notify } = useToast()
  const { data: records = [], isLoading } = useAnthropometry(clinicId, member.id)
  const createRecord = useCreateAnthropometryRecord(clinicId, member.id)
  const updateRecord = useUpdateAnthropometryRecord(clinicId, member.id)
  const removeRecord = useRemoveAnthropometryRecord(clinicId, member.id)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AnthropometryRecord | null>(null)
  const [toDelete, setToDelete] = useState<AnthropometryRecord | null>(null)
  const [form, setForm] = useState<RecordForm>(emptyForm())

  const anthro = settings.anthropometry
  const enabledFormulas = anthro.skinfolds ? anthro.bodyFatFormulas : []
  // Fórmula "preferida" para el gráfico de % grasa: la primera habilitada.
  const preferredFormula = enabledFormulas[0]

  const birth = toDate(member.birthDate)
  const ctxFor = (recordDate: Date | null): DerivedContext => ({
    sex: member.sex,
    // La edad se calcula A LA FECHA de cada medición: los coeficientes de
    // Durnin cambian por franja etaria y una serie larga puede cruzarla.
    ageYears: birth && recordDate ? ageAt(birth, recordDate) : undefined,
    activityLevel: member.activityLevel,
    fallbackHeightCm: member.heightCm,
  })

  const derivedOf = (r: AnthropometryRecord): AnthropometryDerived =>
    deriveAnthropometry(r, ctxFor(toDate(r.date)))

  const fatOf = (d: AnthropometryDerived, formula: BodyFatFormula): number | null =>
    formula === 'durnin' ? d.bodyFatDurnin : d.bodyFatFaulkner

  // Series ascendentes para los gráficos (el service devuelve descendente)
  const asc = useMemo(() => [...records].reverse(), [records])
  const shortDate = (r: AnthropometryRecord) => {
    const d = toDate(r.date)
    return d ? d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : ''
  }
  const weightSeries = asc.map((r) => ({ label: shortDate(r), value: r.weightKg }))
  const fatSeries = preferredFormula
    ? asc
        .map((r) => ({ label: shortDate(r), value: fatOf(derivedOf(r), preferredFormula) }))
        .filter((p): p is { label: string; value: number } => p.value != null)
    : []

  const missingContext = !member.sex || !birth

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  const openEdit = (r: AnthropometryRecord) => {
    setEditing(r)
    const toStr = (n?: number) => (n != null ? String(n) : '')
    setForm({
      date: toDateInput(r.date),
      weightKg: toStr(r.weightKg),
      heightCm: toStr(r.heightCm),
      perimeters: Object.fromEntries(PERIMETER_FIELDS.map((f) => [f.key, toStr(r.perimeters?.[f.key])])),
      skinfolds: Object.fromEntries(SKINFOLD_FIELDS.map((f) => [f.key, toStr(r.skinfolds?.[f.key])])),
      notes: r.notes ?? '',
    })
    setModalOpen(true)
  }

  const collectGroup = <T extends string>(
    fields: { key: T }[],
    values: Record<string, string>,
  ): Partial<Record<T, number>> | undefined => {
    const out: Partial<Record<T, number>> = {}
    let any = false
    for (const f of fields) {
      const v = num(values[f.key])
      if (v != null) {
        out[f.key] = v
        any = true
      }
    }
    return any ? out : undefined
  }

  const save = async () => {
    const weight = num(form.weightKg)
    if (!weight) return notify('Ingresá el peso de la medición', 'error')
    const perimeters = anthro.perimeters
      ? (collectGroup(PERIMETER_FIELDS, form.perimeters) as Perimeters | undefined)
      : undefined
    const skinfolds = anthro.skinfolds
      ? (collectGroup(SKINFOLD_FIELDS, form.skinfolds) as Skinfolds | undefined)
      : undefined
    const data = {
      date: parseDateInput(form.date || todayDateInput()),
      weightKg: weight,
      heightCm: num(form.heightCm),
      ...(perimeters ? { perimeters } : {}),
      ...(skinfolds ? { skinfolds } : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      createdBy: editing?.createdBy ?? adminUid,
    }
    const ok = await run(
      () =>
        editing
          ? updateRecord.mutateAsync({ recordId: editing.id, data })
          : createRecord.mutateAsync(data),
      {
        success: editing ? 'Medición actualizada' : 'Medición registrada',
        error: 'No se pudo guardar la medición',
      },
    )
    if (ok) setModalOpen(false)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    const ok = await run(() => removeRecord.mutateAsync(toDelete.id), {
      success: 'Medición eliminada',
      error: 'No se pudo eliminar la medición',
    })
    if (ok) setToDelete(null)
  }

  const setPerimeter = (key: string, value: string) =>
    setForm((f) => ({ ...f, perimeters: { ...f.perimeters, [key]: value } }))
  const setSkinfold = (key: string, value: string) =>
    setForm((f) => ({ ...f, skinfolds: { ...f.skinfolds, [key]: value } }))

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-4">
      <PageHelp items={ANTHROPOMETRY_HELP} title="Cómo funciona la antropometría" compact />
      {missingContext && (
        <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <Info className="mt-0.5 size-5 shrink-0 text-sky-600" aria-hidden />
          <p>
            Completá <span className="font-medium">sexo y fecha de nacimiento</span> en la ficha para
            calcular % de grasa y TMB (las fórmulas los necesitan).
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Text variant="label">Mediciones</Text>
        <Button size="sm" leftIcon={<Plus className="size-4" />} onClick={openCreate}>
          Nueva medición
        </Button>
      </div>

      {records.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title="Sin mediciones"
          description="Registrá la primera medición para ver la evolución del paciente."
        />
      ) : (
        <>
          {/* Evolución: recién con 2+ puntos hay una línea que mirar */}
          {(weightSeries.length >= 2 || fatSeries.length >= 2) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {weightSeries.length >= 2 && (
                <Card>
                  <CardHeader title="Evolución del peso" subtitle="kg por medición" />
                  <div className="p-3 pt-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={weightSeries} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="#a1a1aa" />
                        <YAxis
                          domain={['auto', 'auto']}
                          tickLine={false}
                          axisLine={false}
                          fontSize={12}
                          stroke="#a1a1aa"
                          width={36}
                        />
                        <ChartTooltip formatter={(v) => `${Number(v).toFixed(1)} kg`} cursor={{ stroke: '#e4e4e7' }} />
                        <Line
                          type="monotone"
                          dataKey="value"
                          name="Peso"
                          stroke="var(--color-brand-600)"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}
              {preferredFormula && fatSeries.length >= 2 && (
                <Card>
                  <CardHeader
                    title="Evolución del % de grasa"
                    subtitle={FAT_FORMULA_LABELS[preferredFormula]}
                  />
                  <div className="p-3 pt-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={fatSeries} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="#a1a1aa" />
                        <YAxis
                          domain={['auto', 'auto']}
                          tickLine={false}
                          axisLine={false}
                          fontSize={12}
                          stroke="#a1a1aa"
                          width={36}
                        />
                        <ChartTooltip formatter={(v) => `${Number(v).toFixed(1)} %`} cursor={{ stroke: '#e4e4e7' }} />
                        <Line
                          type="monotone"
                          dataKey="value"
                          name="% grasa"
                          stroke="var(--color-brand-400)"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Lista de mediciones, la más reciente primero */}
          <div className="space-y-3">
            {records.map((r) => {
              const d = derivedOf(r)
              return (
                <Card key={r.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{formatDate(r.date)}</p>
                      {r.notes && <p className="mt-0.5 text-xs text-zinc-500">{r.notes}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <IconButton
                        icon={<Pencil className="size-4" />}
                        label="Editar medición"
                        onClick={() => openEdit(r)}
                      />
                      <IconButton
                        icon={<Trash2 className="size-4" />}
                        label="Eliminar medición"
                        tone="danger"
                        onClick={() => setToDelete(r)}
                      />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
                    <Metric label="Peso" value={f1(r.weightKg, ' kg')} />
                    {(r.heightCm ?? member.heightCm) != null && (
                      <Metric label="Talla" value={f0(r.heightCm ?? member.heightCm, ' cm')} />
                    )}
                    {anthro.showBmi && (
                      <Metric
                        label="IMC"
                        value={f1(d.bmi)}
                        hint={d.bmiCategory ? BMI_CATEGORY_LABELS[d.bmiCategory] : undefined}
                      />
                    )}
                    {enabledFormulas.map((formula) => (
                      <Metric
                        key={formula}
                        label="% grasa"
                        value={f1(fatOf(d, formula), ' %')}
                        hint={FAT_FORMULA_LABELS[formula]}
                      />
                    ))}
                    {anthro.skinfolds && d.fatMassKg != null && (
                      <Metric label="Masa grasa" value={f1(d.fatMassKg, ' kg')} />
                    )}
                    {anthro.skinfolds && d.leanMassKg != null && (
                      <Metric label="Masa magra" value={f1(d.leanMassKg, ' kg')} />
                    )}
                    {anthro.perimeters && d.waistHipRatio != null && (
                      <Metric label="ICC" value={f2(d.waistHipRatio)} hint="cintura/cadera" />
                    )}
                    {anthro.showEnergy && d.bmrMifflin != null && (
                      <Metric label="TMB" value={f0(d.bmrMifflin, ' kcal')} hint="Mifflin-St Jeor" />
                    )}
                    {anthro.showEnergy && d.tdee != null && (
                      <Metric label="GET" value={f0(d.tdee, ' kcal')} hint="TMB × actividad" />
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Alta / edición de medición */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar medición' : 'Nueva medición'}
        size="lg"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" fullWidth className="sm:w-auto" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              fullWidth
              className="sm:w-auto"
              loading={createRecord.isPending || updateRecord.isPending}
              onClick={save}
            >
              {editing ? 'Guardar cambios' : 'Registrar medición'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Fecha" required>
              <DateInput value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="Peso (kg)" required>
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                placeholder="72.5"
                value={form.weightKg}
                onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))}
              />
            </FormField>
            <FormField
              label="Talla (cm)"
              hint={member.heightCm != null ? `Vacío usa la talla de la ficha (${member.heightCm} cm)` : undefined}
            >
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                placeholder={member.heightCm != null ? String(member.heightCm) : '170'}
                value={form.heightCm}
                onChange={(e) => setForm((f) => ({ ...f, heightCm: e.target.value }))}
              />
            </FormField>
          </div>

          {anthro.perimeters && (
            <section className="space-y-3 border-t border-zinc-100 pt-4">
              <Text variant="label">Perímetros (cm)</Text>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {PERIMETER_FIELDS.map((f) => (
                  <FormField key={f.key} label={f.label}>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      value={form.perimeters[f.key] ?? ''}
                      onChange={(e) => setPerimeter(f.key, e.target.value)}
                    />
                  </FormField>
                ))}
              </div>
            </section>
          )}

          {anthro.skinfolds && (
            <section className="space-y-3 border-t border-zinc-100 pt-4">
              <Text variant="label">Pliegues (mm)</Text>
              {enabledFormulas.length > 0 && (
                <p className="text-xs text-zinc-500">
                  {enabledFormulas.map((formula) => FORMULA_HINTS[formula]).join(' · ')}
                </p>
              )}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {SKINFOLD_FIELDS.map((f) => (
                  <FormField key={f.key} label={f.label}>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      value={form.skinfolds[f.key] ?? ''}
                      onChange={(e) => setSkinfold(f.key, e.target.value)}
                    />
                  </FormField>
                ))}
              </div>
            </section>
          )}

          <FormField label="Notas">
            <Textarea
              rows={2}
              placeholder="Ej. medición post vacaciones"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar medición"
        description={`¿Querés eliminar la medición del ${toDelete ? formatDate(toDelete.date) : ''}? Esta acción no se puede deshacer.`}
        loading={removeRecord.isPending}
      />
    </div>
  )
}
