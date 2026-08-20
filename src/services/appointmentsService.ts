import { orderBy, Timestamp, where, serverTimestamp } from 'firebase/firestore'
import type { Appointment, AppointmentStatus } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { toDayKey } from '@/utils/dateKeys'
import { addToCollection, getMany, removeOne, updateOne } from './firestore'
import { paths } from './paths'

/**
 * Turnos del consultorio. Auto-id (un paciente puede tener más de un turno el
 * mismo día); las vistas día/semana consultan por rango de `startAt` (campo
 * único → sin índice compuesto). "Mis turnos" del paciente usa el índice
 * (memberUid asc, startAt asc) declarado en firestore.indexes.json.
 */

export interface NewAppointment {
  memberId: string
  memberUid: string
  memberName: string
  startAt: Date
  durationMin: number
  type: Appointment['type']
  tariffId?: string
  status?: AppointmentStatus
  notes?: string
  createdBy: string
}

const ts = (d: Date) => Timestamp.fromDate(d)

/** Turnos en un rango [from, to). */
export function listAppointmentsByRange(clinicId: string, from: Date, to: Date) {
  if (env.demoMode) return demo.listAppointmentsByRange(clinicId, from, to)
  return getMany<Appointment>(
    paths.appointments(clinicId),
    where('startAt', '>=', ts(from)),
    where('startAt', '<', ts(to)),
    orderBy('startAt'),
  )
}

/** Turnos del propio paciente (where memberUid → provably safe con las rules). */
export function listAppointmentsForMember(clinicId: string, memberUid: string) {
  if (env.demoMode) return demo.listAppointmentsForMember(clinicId, memberUid)
  return getMany<Appointment>(
    paths.appointments(clinicId),
    where('memberUid', '==', memberUid),
    orderBy('startAt'),
  )
}

export function createAppointment(clinicId: string, data: NewAppointment) {
  if (env.demoMode) return demo.createAppointment(clinicId, data)
  return addToCollection(paths.appointments(clinicId), {
    memberId: data.memberId,
    memberUid: data.memberUid,
    memberName: data.memberName,
    dayKey: toDayKey(data.startAt),
    startAt: ts(data.startAt),
    durationMin: data.durationMin,
    type: data.type,
    ...(data.tariffId ? { tariffId: data.tariffId } : {}),
    status: data.status ?? 'scheduled',
    ...(data.notes ? { notes: data.notes } : {}),
    createdBy: data.createdBy,
    createdAt: serverTimestamp(),
  })
}

export function updateAppointment(
  clinicId: string,
  appointmentId: string,
  data: Partial<Omit<NewAppointment, 'createdBy'>>,
) {
  if (env.demoMode) return demo.updateAppointment(clinicId, appointmentId, data)
  const { startAt, ...rest } = data
  return updateOne(paths.appointment(clinicId, appointmentId), {
    ...rest,
    ...(startAt ? { startAt: ts(startAt), dayKey: toDayKey(startAt) } : {}),
  })
}

export function setAppointmentStatus(
  clinicId: string,
  appointmentId: string,
  status: AppointmentStatus,
) {
  if (env.demoMode) return demo.setAppointmentStatus(clinicId, appointmentId, status)
  return updateOne(paths.appointment(clinicId, appointmentId), { status })
}

/** El paciente confirma su turno (única transición que las rules le permiten). */
export function confirmMyAppointment(clinicId: string, appointmentId: string) {
  return setAppointmentStatus(clinicId, appointmentId, 'confirmed')
}

export function removeAppointment(clinicId: string, appointmentId: string) {
  if (env.demoMode) return demo.removeAppointment(clinicId, appointmentId)
  return removeOne(paths.appointment(clinicId, appointmentId))
}

/** Solapamiento client-side (UX; no es una garantía transaccional). */
export function overlapsExisting(
  startAt: Date,
  durationMin: number,
  existing: Pick<Appointment, 'startAt' | 'durationMin' | 'status'>[],
  toDate: (v: unknown) => Date | null,
): boolean {
  const start = startAt.getTime()
  const end = start + durationMin * 60_000
  return existing.some((a) => {
    if (a.status === 'cancelled') return false
    const aStart = toDate(a.startAt)?.getTime()
    if (aStart == null) return false
    const aEnd = aStart + a.durationMin * 60_000
    return start < aEnd && aStart < end
  })
}
