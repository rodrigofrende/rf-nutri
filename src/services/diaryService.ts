import { orderBy, serverTimestamp, where } from 'firebase/firestore'
import type { MealDiaryEntry, MealSlot } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { getMany, removeOne, setOne } from './firestore'
import { paths } from './paths'

/**
 * Diario alimentario del paciente: 1 doc por comida por día, id determinístico
 * `${dayKey}_${slot}` (atado en rules → no se puede desdoblar el día). Es el
 * único lugar donde el paciente sube fotos (data URL ≤150 KB, ya comprimida
 * por utils/image.ts antes de llegar acá).
 */

export interface DiaryEntryInput {
  dayKey: string
  slot: MealSlot
  status: MealDiaryEntry['status']
  note?: string
  photoURL?: string
}

export const diaryEntryId = (dayKey: string, slot: MealSlot) => `${dayKey}_${slot}`

/** Entradas en un rango de días [fromDayKey, toDayKey] inclusive. */
export function listDiaryEntries(
  clinicId: string,
  memberId: string,
  fromDayKey: string,
  toDayKey: string,
) {
  if (env.demoMode) return demo.listDiaryEntries(clinicId, memberId, fromDayKey, toDayKey)
  return getMany<MealDiaryEntry>(
    paths.diary(clinicId, memberId),
    where('dayKey', '>=', fromDayKey),
    where('dayKey', '<=', toDayKey),
    orderBy('dayKey'),
  )
}

/** Upsert de la entrada del día+comida (crear y editar son la misma operación). */
export function saveDiaryEntry(clinicId: string, memberId: string, entry: DiaryEntryInput) {
  if (env.demoMode) return demo.saveDiaryEntry(clinicId, memberId, entry)
  const id = diaryEntryId(entry.dayKey, entry.slot)
  // setOne SIN campos undefined: las rules validan keys().hasOnly.
  return setOne(paths.diaryEntry(clinicId, memberId, id), {
    dayKey: entry.dayKey,
    slot: entry.slot,
    status: entry.status,
    ...(entry.note ? { note: entry.note } : {}),
    ...(entry.photoURL ? { photoURL: entry.photoURL } : {}),
    updatedAt: serverTimestamp(),
  })
}

export function removeDiaryEntry(clinicId: string, memberId: string, entryId: string) {
  if (env.demoMode) return demo.removeDiaryEntry(clinicId, memberId, entryId)
  return removeOne(paths.diaryEntry(clinicId, memberId, entryId))
}
