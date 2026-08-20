import { orderBy, Timestamp } from 'firebase/firestore'
import type { CheckIn } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { getMany, removeOne, setOne } from './firestore'
import { paths } from './paths'

/**
 * Check-in semanal del paciente: 1 por semana ISO (id = weekKey, atado en
 * rules). Escalas 1-10 + comentario libre; el valor profesional está en
 * comparar dos check-ins lado a lado (vista admin).
 */

export interface CheckInInput {
  weekKey: string
  energy: number
  sleep: number
  hunger: number
  adherence: number
  comment?: string
}

export function listCheckIns(clinicId: string, memberId: string) {
  if (env.demoMode) return demo.listCheckIns(clinicId, memberId)
  return getMany<CheckIn>(paths.checkIns(clinicId, memberId), orderBy('weekKey', 'desc'))
}

/** Upsert del check-in de la semana. */
export function saveCheckIn(clinicId: string, memberId: string, input: CheckInInput) {
  if (env.demoMode) return demo.saveCheckIn(clinicId, memberId, input)
  return setOne(paths.checkIn(clinicId, memberId, input.weekKey), {
    weekKey: input.weekKey,
    energy: input.energy,
    sleep: input.sleep,
    hunger: input.hunger,
    adherence: input.adherence,
    ...(input.comment ? { comment: input.comment } : {}),
    date: Timestamp.now(),
  })
}

export function removeCheckIn(clinicId: string, memberId: string, weekKey: string) {
  if (env.demoMode) return demo.removeCheckIn(clinicId, memberId, weekKey)
  return removeOne(paths.checkIn(clinicId, memberId, weekKey))
}
