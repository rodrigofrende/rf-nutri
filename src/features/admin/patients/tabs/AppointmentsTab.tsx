import { useMemo, useState } from 'react'
import { CalendarDays, Plus } from 'lucide-react'
import type { Appointment, AppointmentStatus, Member } from '@/types'
import type { NewAppointment } from '@/services/appointmentsService'
import { useCreateAppointment, useMemberAppointments, useSetAppointmentStatus } from '@/hooks/useAppointments'
import { useToastAction } from '@/hooks/useToastAction'
import { Badge, Button, Card, CardBody, EmptyState, Spinner } from '@/components/ui'
import { toDate } from '@/utils/format'
import { AppointmentFormModal } from '@/features/admin/agenda/AppointmentFormModal'
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_TONES,
  APPOINTMENT_TYPE_LABELS,
} from '@/features/admin/agenda/appointmentLabels'

const timeFormatter = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' })
const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

export function AppointmentsTab({
  clinicId,
  member,
  adminUid,
}: {
  clinicId: string
  member: Member
  adminUid: string
}) {
  const run = useToastAction()
  const { data: appointments = [], isLoading } = useMemberAppointments(clinicId, member.id)
  const create = useCreateAppointment(clinicId)
  const setStatus = useSetAppointmentStatus(clinicId)
  const [open, setOpen] = useState(false)

  const { upcoming, past } = useMemo(() => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const withDate = appointments
      .map((a) => ({ appt: a, date: toDate(a.startAt) }))
      .filter((x): x is { appt: Appointment; date: Date } => !!x.date)
    return {
      upcoming: withDate
        .filter((x) => x.date >= startOfToday && x.appt.status !== 'cancelled')
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
      past: withDate
        .filter((x) => x.date < startOfToday || x.appt.status === 'cancelled')
        .sort((a, b) => b.date.getTime() - a.date.getTime()),
    }
  }, [appointments])

  const handleCreate = async (data: Omit<NewAppointment, 'createdBy'>) => {
    const ok = await run(() => create.mutateAsync({ ...data, createdBy: adminUid }), {
      success: 'Turno creado',
      error: 'No se pudo crear el turno',
    })
    if (ok) setOpen(false)
  }

  const mark = (appointmentId: string, status: AppointmentStatus, success: string) =>
    run(() => setStatus.mutateAsync({ appointmentId, status }), {
      success,
      error: 'No se pudo actualizar el turno',
    })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" leftIcon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
          Nuevo turno
        </Button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Sin turnos"
          description="Agendá la próxima consulta de este paciente."
          action={
            <Button size="sm" leftIcon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
              Nuevo turno
            </Button>
          }
        />
      ) : (
        <>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-800">Próximos</h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-zinc-400">No hay turnos próximos.</p>
            ) : (
              upcoming.map(({ appt, date }) => (
                <AppointmentRow
                  key={appt.id}
                  appt={appt}
                  date={date}
                  onComplete={() => void mark(appt.id, 'completed', 'Turno completado')}
                  onNoShow={() => void mark(appt.id, 'no_show', 'Marcado como ausente')}
                />
              ))
            )}
          </section>
          {past.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-zinc-800">Historial</h3>
              {past.map(({ appt, date }) => (
                <AppointmentRow key={appt.id} appt={appt} date={date} />
              ))}
            </section>
          )}
        </>
      )}

      {open && (
        <AppointmentFormModal
          open
          onClose={() => setOpen(false)}
          clinicId={clinicId}
          defaultMemberId={member.id}
          onSubmit={(data) => void handleCreate(data)}
          saving={create.isPending}
        />
      )}
    </div>
  )
}

function AppointmentRow({
  appt,
  date,
  onComplete,
  onNoShow,
}: {
  appt: Appointment
  date: Date
  onComplete?: () => void
  onNoShow?: () => void
}) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium capitalize text-zinc-900">{dateFormatter.format(date)}</p>
          <p className="text-xs text-zinc-500">
            {timeFormatter.format(date)} · {APPOINTMENT_TYPE_LABELS[appt.type]} · {appt.durationMin} min
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={APPOINTMENT_STATUS_TONES[appt.status]}>{APPOINTMENT_STATUS_LABELS[appt.status]}</Badge>
          {onComplete && (appt.status === 'scheduled' || appt.status === 'confirmed') && (
            <Button size="sm" variant="secondary" onClick={onComplete}>
              Asistió
            </Button>
          )}
          {onNoShow && (appt.status === 'scheduled' || appt.status === 'confirmed') && (
            <Button size="sm" variant="ghost" onClick={onNoShow}>
              Ausente
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
