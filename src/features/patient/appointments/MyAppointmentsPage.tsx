import { useMemo } from 'react'
import { CalendarDays, CheckCircle2, Clock } from 'lucide-react'
import type { Appointment, AppointmentStatus, AppointmentType } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useAuth } from '@/providers/AuthProvider'
import { useConfirmMyAppointment, useMyAppointments } from '@/hooks/useAppointments'
import { useToastAction } from '@/hooks/useToastAction'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Card, CardBody, EmptyState, FullPageSpinner, Heading } from '@/components/ui'
import { toDate } from '@/utils/format'
import { MY_APPOINTMENTS_HELP } from '@/content/help'

const TYPE_LABELS: Record<AppointmentType, string> = {
  primera_consulta: 'Primera consulta',
  seguimiento: 'Seguimiento',
  antropometria: 'Antropometría',
  virtual: 'Consulta virtual',
  otro: 'Consulta',
}

const STATUS_META: Record<AppointmentStatus, { label: string; tone: 'neutral' | 'green' | 'amber' | 'red' | 'brand' }> = {
  scheduled: { label: 'Pendiente de confirmar', tone: 'amber' },
  confirmed: { label: 'Confirmado', tone: 'green' },
  completed: { label: 'Asistió', tone: 'neutral' },
  cancelled: { label: 'Cancelado', tone: 'red' },
  no_show: { label: 'No asistió', tone: 'red' },
}

/** "lunes 24 de agosto de 2026" (fecha larga es-AR). */
function longDate(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

function timeLabel(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(date)
}

export function MyAppointmentsPage() {
  const { user } = useAuth()
  const { activeClinicId, activeMembership } = useTenant()
  const clinicId = activeClinicId as string
  const memberId = activeMembership?.memberId ?? ''
  const memberUid = user?.uid ?? ''
  const run = useToastAction()

  const { data: appointments = [], isLoading } = useMyAppointments(clinicId, memberId, memberUid)
  const confirm = useConfirmMyAppointment(clinicId)

  // Próximos: desde el inicio de HOY (un turno de esta tarde sigue siendo próximo)
  // y sin los cancelados, que solo ensucian. Pasados: todo lo demás, reciente primero.
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

  const confirmAppointment = (appointmentId: string) =>
    run(() => confirm.mutateAsync(appointmentId), {
      success: 'Turno confirmado. ¡Te esperamos!',
      error: 'No se pudo confirmar el turno',
    })

  if (isLoading) {
    return (
      <AppLayout title="Mis turnos" help={MY_APPOINTMENTS_HELP} helpTitle="Cómo funcionan tus turnos">
        <FullPageSpinner />
      </AppLayout>
    )
  }

  if (appointments.length === 0) {
    return (
      <AppLayout title="Mis turnos" help={MY_APPOINTMENTS_HELP} helpTitle="Cómo funcionan tus turnos">
        <EmptyState
          icon={CalendarDays}
          title="Todavía no tenés turnos"
          description="Cuando tu nutricionista te agende una consulta, la vas a ver acá."
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Mis turnos"
      subtitle="Tus próximas consultas y tu historial."
      help={MY_APPOINTMENTS_HELP}
      helpTitle="Cómo funcionan tus turnos"
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="space-y-3">
          <Heading variant="card" as="h2">
            Próximos
          </Heading>
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No tenés turnos próximos"
              description="Escribile a tu consultorio si querés coordinar una consulta."
            />
          ) : (
            upcoming.map(({ appt, date }) => {
              const status = STATUS_META[appt.status]
              return (
                <Card key={appt.id}>
                  <CardBody className="space-y-3 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                        <span className="text-sm font-bold leading-none">{date.getDate()}</span>
                        <span className="text-[10px] uppercase leading-tight">
                          {new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(date).replace('.', '')}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold capitalize text-zinc-900">{longDate(date)}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-zinc-600">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3.5 text-zinc-400" aria-hidden />
                            {timeLabel(date)} hs
                          </span>
                          <span aria-hidden>·</span>
                          {TYPE_LABELS[appt.type]}
                          <span aria-hidden>·</span>
                          {appt.durationMin} min
                        </p>
                      </div>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                    {appt.status === 'scheduled' && (
                      <Button
                        fullWidth
                        leftIcon={<CheckCircle2 className="size-4" />}
                        loading={confirm.isPending && confirm.variables === appt.id}
                        onClick={() => void confirmAppointment(appt.id)}
                      >
                        Confirmar asistencia
                      </Button>
                    )}
                  </CardBody>
                </Card>
              )
            })
          )}
        </section>

        {past.length > 0 && (
          <section className="space-y-3">
            <Heading variant="card" as="h2">
              Pasados
            </Heading>
            <Card>
              <div className="divide-y divide-zinc-100">
                {past.map(({ appt, date }) => {
                  const status = STATUS_META[appt.status]
                  return (
                    <div key={appt.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-800">
                          {new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(date)} · {timeLabel(date)} hs
                        </p>
                        <p className="text-xs text-zinc-500">{TYPE_LABELS[appt.type]}</p>
                      </div>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                  )
                })}
              </div>
            </Card>
          </section>
        )}
      </div>
    </AppLayout>
  )
}
