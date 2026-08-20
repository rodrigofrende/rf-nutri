import { orderBy } from 'firebase/firestore'
import type { Note } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { addToCollection, getMany, removeOne } from './firestore'
import { paths } from './paths'

/** Notas privadas del admin. El paciente nunca llama a este service. */
export function listNotes(clinicId: string, memberId: string) {
  if (env.demoMode) return demo.listNotes(clinicId, memberId)
  return getMany<Note>(paths.notes(clinicId, memberId), orderBy('date', 'desc'))
}

export function createNote(clinicId: string, memberId: string, data: Omit<Note, 'id'>) {
  if (env.demoMode) return demo.createNote(clinicId, memberId, data)
  return addToCollection(paths.notes(clinicId, memberId), data)
}

export function removeNote(clinicId: string, memberId: string, noteId: string) {
  if (env.demoMode) return demo.removeNote(clinicId, memberId, noteId)
  return removeOne(paths.note(clinicId, memberId, noteId))
}
