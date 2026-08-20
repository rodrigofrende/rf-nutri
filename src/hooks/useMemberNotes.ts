import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Note } from '@/types'
import { createNote, listNotes, removeNote } from '@/services/notesService'
import { queryKeys } from './queryKeys'

/** Hooks de notas privadas — SOLO se usan en vistas de admin. */
export function useNotes(clinicId: string, uid: string) {
  return useQuery({
    queryKey: queryKeys.notes(clinicId, uid),
    queryFn: () => listNotes(clinicId, uid),
    enabled: !!clinicId && !!uid,
  })
}

export function useCreateNote(clinicId: string, uid: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Note, 'id'>) => createNote(clinicId, uid, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notes(clinicId, uid) }),
  })
}

export function useRemoveNote(clinicId: string, uid: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (noteId: string) => removeNote(clinicId, uid, noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notes(clinicId, uid) }),
  })
}
