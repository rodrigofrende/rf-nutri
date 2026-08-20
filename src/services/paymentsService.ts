import { collection, doc, limit, orderBy, Timestamp, where } from 'firebase/firestore'
import type { ClinicSubscription, Payment, PatientPayment, TariffKind } from '@/types'
import { env } from '@/config/env'
import { db } from '@/lib/firebase'
import * as demo from '@/demo/store'
import { paymentSchema } from '@/validation/schemas'
import { addMonths } from '@/utils/payments'
import { toDate } from '@/utils/format'
import { createBatch, getMany, removeOne } from './firestore'
import { mergeOwnedDocs, type PatientOwner } from './memberOwnership'
import { paths } from './paths'

/**
 * Dos niveles de pagos bien separados:
 * - Cobros a pacientes (`clinics/{id}/payments`): el admin registra que hizo un
 *   servicio (consulta/tratamiento/antropometría) y cuánto cobró. Sin cuotas ni
 *   morosidad. Historial general (admin) + historial propio (paciente).
 * - Cuotas SaaS (`clinics/{id}/subscriptionPayments`): la suscripción del
 *   consultorio a la plataforma, con vencimiento y suspensión (super-admin).
 */

export interface NewPatientPayment {
  memberId: string
  memberUid: string
  memberName: string
  serviceType: TariffKind
  tariffId?: string
  amount: number
  date: Date
  comment?: string
  createdBy: string
}

export interface NewPayment {
  amount: number
  date: Date
  comment?: string
  createdBy: string
}

const ts = (d: Date) => Timestamp.fromDate(d)

const PAYMENTS_LIST_LIMIT = 300
const SUBSCRIPTION_PAYMENTS_LIST_LIMIT = 100

function validateAmountAndDate(p: { amount: number; date: Date; comment?: string; createdBy: string }) {
  const parsed = paymentSchema.safeParse(p)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Pago inválido')
  }
  return parsed.data
}

// ---- Cobros a pacientes ----

/** Historial general del consultorio (vista admin), más recientes primero. */
export function listPayments(clinicId: string) {
  if (env.demoMode) return demo.listPayments(clinicId)
  return getMany<PatientPayment>(
    paths.payments(clinicId),
    orderBy('date', 'desc'),
    limit(PAYMENTS_LIST_LIMIT),
  )
}

/** Historial de un paciente (tab Pagos del detalle). Requiere índice (memberId, date desc). */
export function listPaymentsForMember(clinicId: string, memberId: string) {
  if (env.demoMode) return demo.listPaymentsForMember(clinicId, memberId)
  return getMany<PatientPayment>(
    paths.payments(clinicId),
    where('memberId', '==', memberId),
    orderBy('date', 'desc'),
    limit(PAYMENTS_LIST_LIMIT),
  )
}

/**
 * Historial propio del paciente: uid (rules actuales) y memberId (cobros previos al acceso).
 */
export function listMyPayments(clinicId: string, owner: PatientOwner) {
  if (env.demoMode) return demo.listMyPayments(clinicId, owner.memberId)
  return mergeOwnedDocs([
    owner.memberUid
      ? getMany<PatientPayment>(
          paths.payments(clinicId),
          where('memberUid', '==', owner.memberUid),
          orderBy('date', 'desc'),
          limit(PAYMENTS_LIST_LIMIT),
        )
      : null,
    owner.memberId
      ? getMany<PatientPayment>(
          paths.payments(clinicId),
          where('memberId', '==', owner.memberId),
          orderBy('date', 'desc'),
          limit(PAYMENTS_LIST_LIMIT),
        )
      : null,
  ])
}

/** Registra el cobro de un servicio a un paciente. */
export function recordPayment(clinicId: string, p: NewPatientPayment) {
  if (env.demoMode) return demo.recordPayment(clinicId, p)
  validateAmountAndDate(p)
  const batch = createBatch()
  const paymentRef = doc(collection(db, paths.payments(clinicId)))
  batch.set(paymentRef, {
    memberId: p.memberId,
    memberUid: p.memberUid,
    memberName: p.memberName,
    serviceType: p.serviceType,
    ...(p.tariffId ? { tariffId: p.tariffId } : {}),
    amount: p.amount,
    date: ts(p.date),
    comment: p.comment ?? '',
    createdBy: p.createdBy,
  })
  return batch.commit()
}

export function removePayment(clinicId: string, paymentId: string) {
  if (env.demoMode) return demo.removePayment(clinicId, paymentId)
  return removeOne(paths.payment(clinicId, paymentId))
}

// ---- Cuotas SaaS del consultorio (super-admin) ----

export function listSubscriptionPayments(clinicId: string) {
  if (env.demoMode) return demo.listSubscriptionPayments(clinicId)
  return getMany<Payment>(
    paths.subscriptionPayments(clinicId),
    orderBy('date', 'desc'),
    limit(SUBSCRIPTION_PAYMENTS_LIST_LIMIT),
  )
}

/** Registra el pago de la cuota y avanza el vencimiento +1 mes (atómico). */
export async function registerSubscriptionPayment(
  clinicId: string,
  p: NewPayment,
  sub: ClinicSubscription,
) {
  if (env.demoMode) return demo.registerSubscriptionPayment(clinicId, p, sub)
  validateAmountAndDate(p)
  const nextDue = addMonths(toDate(sub.dueDate) ?? p.date, 1)
  const batch = createBatch()
  const paymentRef = doc(collection(db, paths.subscriptionPayments(clinicId)))
  batch.set(paymentRef, {
    amount: p.amount,
    date: ts(p.date),
    comment: p.comment ?? '',
    createdBy: p.createdBy,
  })
  batch.update(doc(db, paths.clinic(clinicId)), {
    subscription: {
      ...sub,
      lastPaymentDate: ts(p.date),
      dueDate: ts(nextDue),
      status: 'active',
    },
  })
  await batch.commit()
}

export function removeSubscriptionPayment(clinicId: string, paymentId: string) {
  if (env.demoMode) return demo.removeSubscriptionPayment(clinicId, paymentId)
  return removeOne(paths.subscriptionPayment(clinicId, paymentId))
}
