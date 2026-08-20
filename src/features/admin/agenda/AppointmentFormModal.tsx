import { useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle } from 'lucide-react'
import type { Appointment, AppointmentType } from '@/types'
import { overlapsExisting, type NewAppointment } from '@/services/appointmentsService'
import { useAppointments } from '@/hooks/useAppointments'
import { useMembers } from '@/hooks/useMembers'
import { useTariffs } from '@/hooks/useTariffs'
import { Button, FormField, Input, Modal, Select, Textarea } from '@/components/ui'
import { toDate } from '@/utils/format'
import { todayDateInput } from '@/utils/dates'
import { addDays, parseDayKey, toDayKey } from '@/utils/dateKeys'
import { tariffLabel } from '@/utils/tariffs'
import { APPOINTMENT_TYPE_LABELS } from './appointmentLabels'

const APPOINTMENT_TYPE_VALUES = [
  'primera_consulta',
  'seguimiento',
  'antropometria',
  'virtual',
  'otro',
] as const satisfies readonly AppointmentType[]

/** Duraciones ofrecidas. El form las maneja como string (valor nativo del select). */
const BASE_DURATIONS = [15, 30, 45, 60, 90]

const schema = z.object({
  memberId: z.string().min(1, 'Elegí un paciente'),
  date: z.string().min(1, 'Ingresá la fecha'),
  time: z.string().min(1, 'Ingresá la hora'),
  durationMin: z.string().min(1, 'Elegí la duración'),
  type: z.enum(APPOINTMENT_TYPE_VALUES),
  tariffId: z.string().optional(),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const pad = (n: number) => String(n).padStart(2, '0')

/** Combina fecha (YYYY-MM-DD) y hora (HH:mm) en un Date LOCAL. Inválido → null. */
function buildStartAt(date: string, time: string): Date | null {
  const day = parseDayKey(date)
  const m = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!day || !m) return null
  day.setHours(Number(m[1]), Number(m[2]), 0, 0)
  return day
}

function valuesFrom(
  initial: Appointment | null | undefined,
  defaultDayKey?: string,
  defaultMemberId?: string,
): FormValues {
  if (!initial) {
    return {
      memberId: defaultMemberId ?? '',
      date: defaultDayKey ?? todayDateInput(),
      time: '09:00',
      durationMin: '30',
      type: 'seguimiento',
      tariffId: '',
      notes: '',
    }
  }
  const start = toDate(initial.startAt)
  return {
    memberId: initial.memberId,
    date: start ? toDayKey(start) : initial.dayKey,
    time: start ? `${pad(start.getHours())}:${pad(start.getMinutes())}` : '09:00',
    durationMin: String(initial.durationMin),
    type: initial.type,
    tariffId: initial.tariffId ?? '',
    notes: initial.notes ?? '',
  }
}

export function AppointmentFormModal({
  open,
  onClose,
  clinicId,
  initial,
  defaultDayKey,
  defaultMemberId,
  onSubmit,
  saving,
}: {
  open: boolean
  onClose: () => void
  clinicId: string
  /** Turno a editar; null/undefined = alta. */
  initial?: Appointment | null
  /** Fecha precargada al crear desde un día navegado de la agenda. */
  defaultDayKey?: string
  /** Paciente precargado al crear desde la ficha. */
  defaultMemberId?: string
  /** El caller agrega `createdBy` y decide crear o actualizar. */
  onSubmit: (data: Omit<NewAppointment, 'createdBy'>) => void
  saving?: boolean
}) {
  const { data: members = [] } = useMembers(clinicId)
  const { data: tariffs = [] } = useTariffs(clinicId)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: valuesFrom(initial, defaultDayKey, defaultMemberId),
  })

  const patientOptions = useMemo(
    () =>
      members
        .filter((m) => m.role === 'user')
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'))
        .map((m) => ({ value: m.id, label: m.fullName })),
    [members],
  )

  const tariffOptions = useMemo(
    () => tariffs.filter((t) => t.active).map((t) => ({ value: t.id, label: tariffLabel(t) })),
    [tariffs],
  )

  // Si el turno editado tiene una duración fuera del listado, se suma como opción
  // para que el select no quede en blanco.
  const durationOptions = useMemo(() => {
    const list = [...BASE_DURATIONS]
    if (initial && !list.includes(initial.durationMin)) list.push(initial.durationMin)
    return list.sort((a, b) => a - b).map((m) => ({ value: String(m), label: `${m} min` }))
  }, [initial])

  const typeOptions = APPOINTMENT_TYPE_VALUES.map((t) => ({
    value: t,
    label: APPOINTMENT_TYPE_LABELS[t],
  }))

  // Aviso de solapamiento NO bloqueante: se consultan los turnos del día elegido
  // y se compara contra fecha+hora+duración tipeadas. Es UX, no una garantía
  // transaccional (dos admins podrían pisar el mismo horario igual).
  const date = useWatch({ control, name: 'date' })
  const time = useWatch({ control, name: 'time' })
  const durationMin = useWatch({ control, name: 'durationMin' })
  const dayStart = useMemo(() => {
    const d = parseDayKey(date)
    if (d) return d
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  }, [date])
  const dayEnd = useMemo(() => addDays(dayStart, 1), [dayStart])
  const { data: dayAppointments = [] } = useAppointments(clinicId, dayStart, dayEnd)

  const startAt = buildStartAt(date, time)
  const overlap =
    !!startAt &&
    overlapsExisting(
      startAt,
      Number(durationMin) || 0,
      dayAppointments.filter((a) => a.id !== initial?.id),
      // overlapsExisting tipa el normalizador como (unknown) => Date | null; acá
      // los startAt siempre son DateValue, así que el cast es seguro.
      (v) => toDate(v as Appointment['startAt']),
    )

  const submit = (v: FormValues) => {
    const built = buildStartAt(v.date, v.time)
    if (!built) {
      setError('time', { message: 'Revisá la fecha y la hora' })
      return
    }
    const member = members.find((m) => m.id === v.memberId)
    if (!member) {
      setError('memberId', { message: 'Elegí un paciente' })
      return
    }
    onSubmit({
      memberId: member.id,
      memberUid: member.uid ?? '',
      memberName: member.fullName,
      startAt: built,
      durationMin: Number(v.durationMin),
      type: v.type,
      ...(v.tariffId ? { tariffId: v.tariffId } : {}),
      ...(v.notes?.trim() ? { notes: v.notes.trim() } : {}),
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar turno' : 'Nuevo turno'} size="lg">
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <FormField label="Paciente" error={errors.memberId?.message} required>
          <Select
            options={patientOptions}
            placeholder="Elegí un paciente"
            {...register('memberId')}
            invalid={!!errors.memberId}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Fecha" error={errors.date?.message} required>
            <Input type="date" {...register('date')} invalid={!!errors.date} />
          </FormField>
          <FormField label="Hora" error={errors.time?.message} required>
            <Input type="time" {...register('time')} invalid={!!errors.time} />
          </FormField>
          <FormField label="Duración" error={errors.durationMin?.message}>
            <Select options={durationOptions} {...register('durationMin')} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Tipo de turno">
            <Select options={typeOptions} {...register('type')} />
          </FormField>
          <FormField label="Tarifa" hint="Opcional, como referencia para el cobro.">
            <Select options={tariffOptions} placeholder="Sin tarifa" {...register('tariffId')} />
          </FormField>
        </div>

        <FormField label="Notas">
          <Textarea
            rows={2}
            placeholder="Ej. Traer últimos análisis de sangre"
            {...register('notes')}
          />
        </FormField>

        {overlap && (
          <div className="flex items-start gap-2 rounded-[var(--radius-control)] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>Este horario se superpone con otro turno del día. Podés guardarlo igual.</p>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? 'Guardar' : 'Crear turno'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
