import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ClinicSubscription } from '@/types'
import {
  listMyPayments,
  listPayments,
  listPaymentsForMember,
  listSubscriptionPayments,
  recordPayment,
  registerSubscriptionPayment,
  removePayment,
  removeSubscriptionPayment,
  type NewPatientPayment,
  type NewPayment,
} from '@/services/paymentsService'
import { queryKeys } from './queryKeys'

// ---- Cobros a pacientes ----

/** Historial general del consultorio (vista admin). */
export function usePayments(clinicId: string) {
  return useQuery({
    queryKey: queryKeys.payments(clinicId),
    queryFn: () => listPayments(clinicId),
    enabled: !!clinicId,
  })
}

/** Historial de un paciente (tab Pagos del detalle, vista admin). */
export function useMemberPayments(clinicId: string, memberId: string) {
  return useQuery({
    queryKey: queryKeys.memberPayments(clinicId, memberId),
    queryFn: () => listPaymentsForMember(clinicId, memberId),
    enabled: !!clinicId && !!memberId,
  })
}

/** Historial propio del paciente logueado. */
export function useMyPayments(clinicId: string, memberUid: string) {
  return useQuery({
    queryKey: queryKeys.myPayments(clinicId, memberUid),
    queryFn: () => listMyPayments(clinicId, memberUid),
    enabled: !!clinicId && !!memberUid,
  })
}

export function useRecordPayment(clinicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payment: NewPatientPayment) => {
      await recordPayment(clinicId, payment)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments(clinicId) })
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(clinicId) })
    },
  })
}

export function useRemovePayment(clinicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (paymentId: string) => removePayment(clinicId, paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments(clinicId) })
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(clinicId) })
    },
  })
}

// ---- Cuotas SaaS del consultorio (super-admin) ----

export function useSubscriptionPayments(clinicId: string) {
  return useQuery({
    queryKey: queryKeys.subscriptionPayments(clinicId),
    queryFn: () => listSubscriptionPayments(clinicId),
    enabled: !!clinicId,
  })
}

export function useRegisterSubscriptionPayment(clinicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ payment, subscription }: { payment: NewPayment; subscription: ClinicSubscription }) =>
      registerSubscriptionPayment(clinicId, payment, subscription),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.subscriptionPayments(clinicId) })
      qc.invalidateQueries({ queryKey: queryKeys.clinics() })
      qc.invalidateQueries({ queryKey: queryKeys.clinic(clinicId) })
      qc.invalidateQueries({ queryKey: ['memberships'] })
    },
  })
}

export function useRemoveSubscriptionPayment(clinicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (paymentId: string) => removeSubscriptionPayment(clinicId, paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.subscriptionPayments(clinicId) })
    },
  })
}
