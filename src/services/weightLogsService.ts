import { orderBy, Timestamp } from 'firebase/firestore'
import type { WeightLog } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { getMany, removeOne, setOne } from './firestore'
import { paths } from './paths'

/**
 * Peso autorreportado por el paciente: 1 registro por día (id = dayKey, atado
 * en rules). Serie separada de la antropometría (peso medido en consultorio):
 * los gráficos de evolución superponen ambas.
 */

export interface WeightLogInput {
  dayKey: string
  weightKg: number
  note?: string
}

export function listWeightLogs(clinicId: string, memberId: string) {
  if (env.demoMode) return demo.listWeightLogs(clinicId, memberId)
  return getMany<WeightLog>(paths.weightLogs(clinicId, memberId), orderBy('dayKey'))
}

/** Upsert del peso del día. */
export function saveWeightLog(clinicId: string, memberId: string, input: WeightLogInput) {
  if (env.demoMode) return demo.saveWeightLog(clinicId, memberId, input)
  return setOne(paths.weightLog(clinicId, memberId, input.dayKey), {
    dayKey: input.dayKey,
    weightKg: input.weightKg,
    ...(input.note ? { note: input.note } : {}),
    date: Timestamp.now(),
  })
}

export function removeWeightLog(clinicId: string, memberId: string, dayKey: string) {
  if (env.demoMode) return demo.removeWeightLog(clinicId, memberId, dayKey)
  return removeOne(paths.weightLog(clinicId, memberId, dayKey))
}
