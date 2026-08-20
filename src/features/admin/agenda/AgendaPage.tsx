import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Ban,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  UserX,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Appointment, AppointmentStatus } from '@/types'
import type { NewAppointment } from '@/services/appointmentsService'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import {
  useAppointments,
  useCreateAppointment,
  useRemoveAppointment,
  useSetAppointmentStatus,
  useUpdateAppointment,
} from '@/hooks/useAppointments'
import { useToastAction } from '@/hooks/useToastAction'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FullPageSpinner,
  IconButton,
  Text,
} from '@/components/ui'
import { cn } from '@/utils/cn'
import { toDate } from '@/utils/format'
import { startOfWeek, WEEKDAYS_SHORT } from '@/utils/dates'
import { addDays, toDayKey, todayKey } from '@/utils/dateKeys'
import { adminPatientDetail } from '@/routes/routePaths'
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_TONES,
  APPOINTMENT_TYPE_LABELS,
} from './appointmentLabels'
import { AppointmentFormModal } from './AppointmentFormModal'

type AgendaView = 'day' | 'week'

const timeFormatter = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' })
const dayLongFormatter = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const dayShortFormatter = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' })

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function formatTime(value: Appointment['startAt']): string {
  const date = toDate(value)
  return date ? timeFormatter.format(date) : '—'
}

/** Mensaje de éxito por transición de estado (para el toast). */
const STATUS_SUCCESS: Record<AppointmentStatus, string> = {
  scheduled: 'Turno reprogramado',
  confirmed: 'Turno confirmado',
  completed: 'Turno completado',
  cancelled: 'Turno cancelado',
  no_show: 'Paciente marcado como ausente',
}

export function AgendaPage() {
  const { user } = useAuth()
  const { activeClinicId } = useTenant()
  const clinicId = activeClinicId as string
  const run = useToastAction()

  const [view, setView] = useState<AgendaView>('day')
  const [anchor, setAnchor] = useState<Date>(() => startOfToday())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [toDelete, setToDelete] = useState<Appointment | null>(null)

  // Rango consultado [from, to): 00:00 del primer día → 00:00 del día siguiente
  // al último. La semana arranca el lunes (startOfWeek).
  const range = useMemo(() => {
    const from = view === 'day' ? new Date(anchor) : startOfWeek(anchor)
    return { from, to: addDays(from, view === 'day' ? 1 : 7) }
  }, [view, anchor])

  const { data: appointments = [], isLoading } = useAppointments(clinicId, range.from, range.to)

  // KPIs de HOY y de la semana ACTUAL, independientes de la navegación: si el
  // admin está mirando otra semana, los chips siguen hablando del presente.
  const currentWeekFrom = useMemo(() => startOfWeek(new Date()), [])
  const currentWeekTo = useMemo(() => addDays(currentWeekFrom, 7), [currentWeekFrom])
  const { data: currentWeekAppointments = [] } = useAppointments(
    clinicId,
    currentWeekFrom,
    currentWeekTo,
  )
  const kpis = useMemo(() => {
    const active = currentWeekAppointments.filter((a) => a.status !== 'cancelled')
    const today = todayKey()
    return {
      hoy: active.filter((a) => a.dayKey === today).length,
      semana: active.length,
    }
  }, [currentWeekAppointments])

  const create = useCreateAppointment(clinicId)
  const update = useUpdateAppointment(clinicId)
  const setStatus = useSetAppointmentStatus(clinicId)
  const remove = useRemoveAppointment(clinicId)

  // Agrupado client-side por dayKey (la query ya viene ordenada por startAt).
  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    for (const a of appointments) {
      const list = map.get(a.dayKey) ?? []
      list.push(a)
      map.set(a.dayKey, list)
    }
    return map
  }, [appointments])

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(range.from, i)),
    [range.from],
  )

  const goPrev = () => setAnchor((d) => addDays(d, view === 'day' ? -1 : -7))
  const goNext = () => setAnchor((d) => addDays(d, view === 'day' ? 1 : 7))
  const goToday = () => setAnchor(startOfToday())

  const rangeLabel =
    view === 'day'
      ? dayLongFormatter.format(anchor)
      : `${dayShortFormatter.format(range.from)} – ${dayShortFormatter.format(addDays(range.from, 6))}`

  const openNew = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (a: Appointment) => {
    setEditing(a)
    setModalOpen(true)
  }

  const handleSubmit = async (data: Omit<NewAppointment, 'createdBy'>) => {
    const ok = await run(
      () =>
        editing
          ? update.mutateAsync({ appointmentId: editing.id, data })
          : create.mutateAsync({ ...data, createdBy: user?.uid ?? '' }),
      {
        success: editing ? 'Turno actualizado' : 'Turno creado',
        error: 'No se pudo guardar el turno',
      },
    )
    if (ok) setModalOpen(false)
  }

  const handleSetStatus = (a: Appointment, status: AppointmentStatus) => {
    void run(() => setStatus.mutateAsync({ appointmentId: a.id, status }), {
      success: STATUS_SUCCESS[status],
      error: 'No se pudo actualizar el turno',
    })
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    const ok = await run(() => remove.mutateAsync(toDelete.id), {
      success: 'Turno eliminado',
      error: 'No se pudo eliminar el turno',
    })
    if (ok) setToDelete(null)
  }

  const renderCard = (a: Appointment, compact = false) => (
    <AppointmentCard
      key={a.id}
      appointment={a}
      compact={compact}
      onEdit={() => openEdit(a)}
      onDelete={() => setToDelete(a)}
      onSetStatus={(status) => handleSetStatus(a, status)}
    />
  )

  const dayList = byDay.get(toDayKey(anchor)) ?? []

  return (
    <AppLayout
      title="Agenda"
      subtitle="Turnos de tu consultorio, por día o por semana."
      actions={
        <Button leftIcon={<Plus className="size-4" />} onClick={openNew}>
          Nuevo turno
        </Button>
      }
    >
      {/* KPI chips del presente (sin contar cancelados) */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:max-w-md">
        <KpiChip icon={CalendarCheck} label="Turnos hoy" value={kpis.hoy} tone="brand" />
        <KpiChip icon={CalendarRange} label="Esta semana" value={kpis.semana} tone="neutral" />
      </div>

      {/* Toggle de vista + navegación */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex self-start rounded-[var(--radius-control)] border border-zinc-200 bg-surface p-0.5"
          role="group"
          aria-label="Vista de la agenda"
        >
          <ViewButton active={view === 'day'} onClick={() => setView('day')}>
            Día
          </ViewButton>
          <ViewButton active={view === 'week'} onClick={() => setView('week')}>
            Semana
          </ViewButton>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            icon={<ChevronLeft className="size-5" />}
            label={view === 'day' ? 'Día anterior' : 'Semana anterior'}
            onClick={goPrev}
          />
          <Button size="sm" variant="secondary" onClick={goToday}>
            Hoy
          </Button>
          <IconButton
            icon={<ChevronRight className="size-5" />}
            label={view === 'day' ? 'Día siguiente' : 'Semana siguiente'}
            onClick={goNext}
          />
          <span className="ml-2 text-sm font-medium capitalize text-zinc-700">{rangeLabel}</span>
        </div>
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : view === 'day' ? (
        dayList.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Sin turnos este día"
            description="No hay turnos agendados para esta fecha. Creá uno con «Nuevo turno»."
            action={
              <Button size="sm" leftIcon={<Plus className="size-4" />} onClick={openNew}>
                Nuevo turno
              </Button>
            }
          />
        ) : (
          <div className="max-w-2xl space-y-3">{dayList.map((a) => renderCard(a))}</div>
        )
      ) : (
        <>
          {/* Semana desktop: 7 columnas compactas (lunes a domingo) */}
          <div className="hidden lg:grid lg:grid-cols-7 lg:gap-2">
            {weekDays.map((day, i) => {
              const key = toDayKey(day)
              const list = byDay.get(key) ?? []
              const isToday = key === todayKey()
              return (
                <div key={key} className="min-w-0">
                  <div
                    className={cn(
                      'mb-2 rounded-[var(--radius-control)] px-2 py-1.5 text-center text-xs font-medium',
                      isToday ? 'bg-brand-50 text-brand-700' : 'bg-zinc-50 text-zinc-500',
                    )}
                  >
                    {WEEKDAYS_SHORT[i]} {day.getDate()}/{day.getMonth() + 1}
                  </div>
                  <div className="space-y-2">
                    {list.length === 0 ? (
                      <p className="py-3 text-center text-xs text-zinc-300">—</p>
                    ) : (
                      list.map((a) => renderCard(a, true))
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Semana mobile: lista vertical agrupada por día */}
          <div className="space-y-5 lg:hidden">
            {weekDays.map((day, i) => {
              const key = toDayKey(day)
              const list = byDay.get(key) ?? []
              const isToday = key === todayKey()
              return (
                <section key={key}>
                  <h2
                    className={cn(
                      'mb-2 text-sm font-semibold',
                      isToday ? 'text-brand-700' : 'text-zinc-700',
                    )}
                  >
                    {WEEKDAYS_SHORT[i]} {day.getDate()}/{day.getMonth() + 1}
                    {isToday && ' · Hoy'}
                  </h2>
                  {list.length === 0 ? (
                    <Text variant="caption">Sin turnos</Text>
                  ) : (
                    <div className="space-y-3">{list.map((a) => renderCard(a))}</div>
                  )}
                </section>
              )
            })}
          </div>
        </>
      )}

      {modalOpen && (
        <AppointmentFormModal
          open
          onClose={() => setModalOpen(false)}
          clinicId={clinicId}
          initial={editing}
          defaultDayKey={toDayKey(view === 'day' ? anchor : new Date())}
          onSubmit={handleSubmit}
          saving={create.isPending || update.isPending}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar turno"
        description={`¿Querés eliminar el turno de ${toDelete?.memberName ?? ''} del ${
          toDelete ? formatTime(toDelete.startAt) : ''
        }? Esta acción no se puede deshacer.`}
        loading={remove.isPending}
      />
    </AppLayout>
  )
}

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-[calc(var(--radius-control)-2px)] px-3.5 py-1.5 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        active ? 'bg-brand-600 text-white' : 'text-zinc-600 hover:bg-zinc-50',
      )}
    >
      {children}
    </button>
  )
}

function KpiChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: number
  tone: 'brand' | 'neutral'
}) {
  const toneClass = tone === 'brand' ? 'bg-brand-50 text-brand-600' : 'bg-zinc-100 text-zinc-600'
  return (
    <Card className="flex items-center gap-3 px-4 py-3">
      <div className={`flex size-9 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xl font-bold text-zinc-900">{value}</p>
        <Text variant="caption">{label}</Text>
      </div>
    </Card>
  )
}

function AppointmentCard({
  appointment: a,
  compact,
  onEdit,
  onDelete,
  onSetStatus,
}: {
  appointment: Appointment
  compact?: boolean
  onEdit: () => void
  onDelete: () => void
  onSetStatus: (status: AppointmentStatus) => void
}) {
  return (
    <Card className={cn(compact ? 'p-2.5' : 'p-4', a.status === 'cancelled' && 'opacity-60')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'flex items-center gap-1 font-medium text-zinc-500',
              compact ? 'text-[11px]' : 'text-xs',
            )}
          >
            <Clock className={cn('shrink-0', compact ? 'size-3' : 'size-3.5')} aria-hidden />
            {formatTime(a.startAt)} · {a.durationMin} min
          </p>
          <Link
            to={adminPatientDetail(a.memberId)}
            className={cn(
              'mt-0.5 block truncate font-medium text-zinc-900 hover:text-brand-700 hover:underline',
              compact ? 'text-xs' : 'text-sm',
            )}
          >
            {a.memberName}
          </Link>
          <p className={cn('text-zinc-500', compact ? 'text-[11px]' : 'text-xs')}>
            {APPOINTMENT_TYPE_LABELS[a.type]}
          </p>
        </div>
        <AppointmentMenu appointment={a} onEdit={onEdit} onDelete={onDelete} onSetStatus={onSetStatus} />
      </div>
      <div className={compact ? 'mt-1.5' : 'mt-2'}>
        <Badge tone={APPOINTMENT_STATUS_TONES[a.status]}>
          {APPOINTMENT_STATUS_LABELS[a.status]}
        </Badge>
      </div>
    </Card>
  )
}

/** Transiciones de estado ofrecidas en el menú (se oculta la del estado actual). */
const STATUS_ACTIONS: { status: AppointmentStatus; label: string; icon: LucideIcon }[] = [
  { status: 'confirmed', label: 'Confirmar', icon: Check },
  { status: 'completed', label: 'Completar', icon: CheckCheck },
  { status: 'cancelled', label: 'Cancelar turno', icon: Ban },
  { status: 'no_show', label: 'Marcar ausente', icon: UserX },
]

function AppointmentMenu({
  appointment,
  onEdit,
  onDelete,
  onSetStatus,
}: {
  appointment: Appointment
  onEdit: () => void
  onDelete: () => void
  onSetStatus: (status: AppointmentStatus) => void
}) {
  const [open, setOpen] = useState(false)
  const items = STATUS_ACTIONS.filter((i) => i.status !== appointment.status)

  const pick = (action: () => void) => {
    setOpen(false)
    action()
  }

  return (
    <div className="relative shrink-0">
      <IconButton
        icon={<MoreVertical className="size-4" />}
        label={`Acciones del turno de ${appointment.memberName}`}
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <>
          {/* Backdrop invisible: cierra el menú al clickear afuera */}
          <div className="fixed inset-0 z-10" aria-hidden onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-zinc-200 bg-surface p-1 shadow-lg"
          >
            {items.map(({ status, label, icon: Icon }) => (
              <button
                key={status}
                type="button"
                role="menuitem"
                onClick={() => pick(() => onSetStatus(status))}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <Icon className="size-4 text-zinc-400" aria-hidden />
                {label}
              </button>
            ))}
            <div className="my-1 border-t border-zinc-100" aria-hidden />
            <button
              type="button"
              role="menuitem"
              onClick={() => pick(onEdit)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <Pencil className="size-4 text-zinc-400" aria-hidden />
              Editar
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => pick(onDelete)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-4" aria-hidden />
              Eliminar
            </button>
          </div>
        </>
      )}
    </div>
  )
}
