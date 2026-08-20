import { orderBy, where } from 'firebase/firestore'
import type { Appointment, MealPlan, PatientPayment } from '@/types'
import { env } from '@/config/env'
import { batchUpdate, createBatch, getMany } from './firestore'
import { paths } from './paths'

export type PatientOwner = {
  memberId: string
  memberUid: string
}

/** Une queries que pueden fallar (rules viejas vs nuevas) sin perder lo que sí se leyó. */
export async function mergeOwnedDocs<T extends { id: string }>(
  queries: Array<Promise<T[]> | null>,
): Promise<T[]> {
  const settled = await Promise.allSettled(queries.filter((q): q is Promise<T[]> => q != null))
  const byId = new Map<string, T>()
  let lastError: unknown
  let ok = false
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      ok = true
      for (const item of result.value) byId.set(item.id, item)
    } else {
      lastError = result.reason
    }
  }
  if (!ok && lastError) throw lastError
  return [...byId.values()]
}

/**
 * Copia el uid de Auth al plan/turno/cobro. Si se asignaron antes de que el
 * paciente reclamara el acceso, `memberUid` quedó vacío y las rules desplegadas
 * no le dejan listar por memberId.
 */
export async function syncMemberUidOnAssignedRecords(
  clinicId: string,
  memberId: string,
  memberUid: string,
): Promise<void> {
  if (env.demoMode || !clinicId || !memberId || !memberUid) return

  const [plans, appointments, payments] = await Promise.all([
    getMany<MealPlan>(paths.mealPlans(clinicId), where('memberId', '==', memberId)),
    getMany<Appointment>(paths.appointments(clinicId), where('memberId', '==', memberId)),
    getMany<PatientPayment>(paths.payments(clinicId), where('memberId', '==', memberId)),
  ])

  const batch = createBatch()
  let pending = 0
  for (const plan of plans) {
    if (plan.memberUid === memberUid) continue
    batchUpdate(batch, paths.mealPlan(clinicId, plan.id), { memberUid })
    pending += 1
  }
  for (const appointment of appointments) {
    if (appointment.memberUid === memberUid) continue
    batchUpdate(batch, paths.appointment(clinicId, appointment.id), { memberUid })
    pending += 1
  }
  for (const payment of payments) {
    if (payment.memberUid === memberUid) continue
    batchUpdate(batch, paths.payment(clinicId, payment.id), { memberUid })
    pending += 1
  }
  if (pending === 0) return
  await batch.commit()
}
