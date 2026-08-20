import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AppointmentStatus } from '@/types'
import {
  confirmMyAppointment,
  createAppointment,
  listAppointmentsByRange,
  listAppointmentsForMember,
  removeAppointment,
  setAppointmentStatus,
  updateAppointment,
  type NewAppointment,
} from '@/services/appointmentsService'
import { toDayKey } from '@/utils/dateKeys'
import { queryKeys } from './queryKeys'

/** Turnos en un rango [from, to) — agenda día/semana del admin. */
export function useAppointments(clinicId: string, from: Date, to: Date) {
  return useQuery({
    queryKey: queryKeys.appointments(clinicId, toDayKey(from), toDayKey(to)),
    queryFn: () => listAppointmentsByRange(clinicId, from, to),
    enabled: !!clinicId,
  })
}

/** Turnos del propio paciente. */
export function useMyAppointments(clinicId: string, memberUid: string) {
  return useQuery({
    queryKey: queryKeys.myAppointments(clinicId, memberUid),
    queryFn: () => listAppointmentsForMember(clinicId, memberUid),
    enabled: !!clinicId && !!memberUid,
  })
}

function useInvalidateAppointments(clinicId: string) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['appointments', clinicId] })
    qc.invalidateQueries({ queryKey: queryKeys.dashboard(clinicId) })
  }
}

export function useCreateAppointment(clinicId: string) {
  const invalidate = useInvalidateAppointments(clinicId)
  return useMutation({
    mutationFn: (data: NewAppointment) => createAppointment(clinicId, data),
    onSuccess: invalidate,
  })
}

export function useUpdateAppointment(clinicId: string) {
  const invalidate = useInvalidateAppointments(clinicId)
  return useMutation({
    mutationFn: ({
      appointmentId,
      data,
    }: {
      appointmentId: string
      data: Partial<Omit<NewAppointment, 'createdBy'>>
    }) => updateAppointment(clinicId, appointmentId, data),
    onSuccess: invalidate,
  })
}

export function useSetAppointmentStatus(clinicId: string) {
  const invalidate = useInvalidateAppointments(clinicId)
  return useMutation({
    mutationFn: ({ appointmentId, status }: { appointmentId: string; status: AppointmentStatus }) =>
      setAppointmentStatus(clinicId, appointmentId, status),
    onSuccess: invalidate,
  })
}

/** El paciente confirma su turno. */
export function useConfirmMyAppointment(clinicId: string) {
  const invalidate = useInvalidateAppointments(clinicId)
  return useMutation({
    mutationFn: (appointmentId: string) => confirmMyAppointment(clinicId, appointmentId),
    onSuccess: invalidate,
  })
}

export function useRemoveAppointment(clinicId: string) {
  const invalidate = useInvalidateAppointments(clinicId)
  return useMutation({
    mutationFn: (appointmentId: string) => removeAppointment(clinicId, appointmentId),
    onSuccess: invalidate,
  })
}
