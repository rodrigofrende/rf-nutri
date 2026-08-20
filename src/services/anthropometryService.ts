import { orderBy, Timestamp } from 'firebase/firestore'
import type { AnthropometryRecord } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { addToCollection, getMany, removeOne, updateOne } from './firestore'
import { paths } from './paths'

/**
 * Mediciones antropométricas del paciente. Las escribe SOLO el admin (en
 * consulta); el paciente lee su propia evolución. Se guardan crudos: los
 * derivados (IMC, % grasa, TMB...) se calculan en utils/anthropometry.ts.
 */

export interface NewAnthropometryRecord extends Omit<AnthropometryRecord, 'id' | 'date'> {
  date: Date
}

export function listAnthropometry(clinicId: string, memberId: string) {
  if (env.demoMode) return demo.listAnthropometry(clinicId, memberId)
  return getMany<AnthropometryRecord>(
    paths.anthropometry(clinicId, memberId),
    orderBy('date', 'desc'),
  )
}

export function createAnthropometryRecord(
  clinicId: string,
  memberId: string,
  data: NewAnthropometryRecord,
) {
  if (env.demoMode) return demo.createAnthropometryRecord(clinicId, memberId, data)
  return addToCollection(paths.anthropometry(clinicId, memberId), {
    ...data,
    date: Timestamp.fromDate(data.date),
  })
}

export function updateAnthropometryRecord(
  clinicId: string,
  memberId: string,
  recordId: string,
  data: Partial<NewAnthropometryRecord>,
) {
  if (env.demoMode) return demo.updateAnthropometryRecord(clinicId, memberId, recordId, data)
  const { date, ...rest } = data
  return updateOne(paths.anthropometryRecord(clinicId, memberId, recordId), {
    ...rest,
    ...(date ? { date: Timestamp.fromDate(date) } : {}),
  })
}

export function removeAnthropometryRecord(clinicId: string, memberId: string, recordId: string) {
  if (env.demoMode) return demo.removeAnthropometryRecord(clinicId, memberId, recordId)
  return removeOne(paths.anthropometryRecord(clinicId, memberId, recordId))
}
