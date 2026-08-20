import { orderBy, serverTimestamp, where } from 'firebase/firestore'
import type { MealPlan, Member } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import {
  addToCollection,
  batchUpdate,
  createBatch,
  getMany,
  getOne,
  removeOne,
  updateOne,
} from './firestore'
import { mergeOwnedDocs, type PatientOwner } from './memberOwnership'
import { paths } from './paths'

/**
 * Planes alimentarios. Sin colección de asignaciones (a diferencia de las
 * rutinas de RF-FIT): el plan es personal — lleva memberId/memberUid en el doc
 * y `status: 'active'` marca el plan vigente del paciente. Los templates llevan
 * `isTemplate: true` + memberUid '' → invisibles para pacientes por rules.
 */

export function listMealPlans(clinicId: string) {
  if (env.demoMode) return demo.listMealPlans(clinicId)
  return getMany<MealPlan>(paths.mealPlans(clinicId), orderBy('name'))
}

export function getMealPlan(clinicId: string, planId: string) {
  if (env.demoMode) return demo.getMealPlan(clinicId, planId)
  return getOne<MealPlan>(paths.mealPlan(clinicId, planId))
}

/**
 * Planes del propio paciente. Consulta por uid (rules actuales) y por memberId
 * (si el plan se asignó antes de reclamar el acceso).
 */
export function listPlansForMember(clinicId: string, owner: PatientOwner) {
  if (env.demoMode) return demo.listPlansForMember(clinicId, owner.memberId)
  return mergeOwnedDocs([
    owner.memberUid
      ? getMany<MealPlan>(paths.mealPlans(clinicId), where('memberUid', '==', owner.memberUid))
      : null,
    owner.memberId
      ? getMany<MealPlan>(paths.mealPlans(clinicId), where('memberId', '==', owner.memberId))
      : null,
  ])
}

export function createMealPlan(clinicId: string, data: Omit<MealPlan, 'id'>) {
  if (env.demoMode) return demo.createMealPlan(clinicId, data)
  return addToCollection(paths.mealPlans(clinicId), { ...data, updatedAt: serverTimestamp() })
}

export function updateMealPlan(clinicId: string, planId: string, data: Partial<Omit<MealPlan, 'id'>>) {
  if (env.demoMode) return demo.updateMealPlan(clinicId, planId, data)
  return updateOne(paths.mealPlan(clinicId, planId), { ...data, updatedAt: serverTimestamp() })
}

export function removeMealPlan(clinicId: string, planId: string) {
  if (env.demoMode) return demo.removeMealPlan(clinicId, planId)
  return removeOne(paths.mealPlan(clinicId, planId))
}

/** Guarda una copia del plan como template reutilizable. */
export async function saveAsTemplate(clinicId: string, plan: MealPlan, name?: string) {
  const { id: _id, ...rest } = plan
  return createMealPlan(clinicId, {
    ...rest,
    name: name ?? `${plan.name} (template)`,
    isTemplate: true,
    memberId: '',
    memberUid: '',
    status: 'draft',
  })
}

/** Duplica un plan (o template) como borrador sin asignar. */
export async function duplicateMealPlan(clinicId: string, plan: MealPlan, name?: string) {
  const { id: _id, ...rest } = plan
  return createMealPlan(clinicId, {
    ...rest,
    name: name ?? `${plan.name} (copia)`,
    isTemplate: false,
    memberId: '',
    memberUid: '',
    status: 'draft',
  })
}

/**
 * Asigna un plan a un paciente y lo activa. ATÓMICO: archiva el plan activo
 * anterior del paciente y activa el nuevo en el mismo batch (nunca quedan dos
 * planes activos, ni ninguno a mitad de camino).
 */
export async function assignPlanToPatient(
  clinicId: string,
  planId: string,
  member: Pick<Member, 'id' | 'uid'>,
) {
  if (env.demoMode) return demo.assignPlanToPatient(clinicId, planId, member)
  const current = await getMany<MealPlan>(
    paths.mealPlans(clinicId),
    where('memberId', '==', member.id),
    where('status', '==', 'active'),
  )
  const batch = createBatch()
  for (const plan of current) {
    if (plan.id !== planId) {
      batchUpdate(batch, paths.mealPlan(clinicId, plan.id), { status: 'archived' })
    }
  }
  batchUpdate(batch, paths.mealPlan(clinicId, planId), {
    memberId: member.id,
    memberUid: member.uid,
    isTemplate: false,
    status: 'active',
    updatedAt: serverTimestamp(),
  })
  await batch.commit()
}
