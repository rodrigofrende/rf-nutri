import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listDiaryEntries,
  removeDiaryEntry,
  saveDiaryEntry,
  type DiaryEntryInput,
} from '@/services/diaryService'
import {
  listWeightLogs,
  removeWeightLog,
  saveWeightLog,
  type WeightLogInput,
} from '@/services/weightLogsService'
import { queryKeys } from './queryKeys'

// ---- Diario alimentario ----

export function useDiaryEntries(
  clinicId: string,
  memberId: string,
  fromDayKey: string,
  toDayKey: string,
) {
  return useQuery({
    queryKey: queryKeys.diary(clinicId, memberId, fromDayKey, toDayKey),
    queryFn: () => listDiaryEntries(clinicId, memberId, fromDayKey, toDayKey),
    enabled: !!clinicId && !!memberId,
  })
}

export function useSaveDiaryEntry(clinicId: string, memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (entry: DiaryEntryInput) => {
      await saveDiaryEntry(clinicId, memberId, entry)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['diary', clinicId, memberId] })
    },
  })
}

export function useRemoveDiaryEntry(clinicId: string, memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entryId: string) => removeDiaryEntry(clinicId, memberId, entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['diary', clinicId, memberId] })
    },
  })
}

// ---- Peso autorreportado ----

export function useWeightLogs(clinicId: string, memberId: string) {
  return useQuery({
    queryKey: queryKeys.weightLogs(clinicId, memberId),
    queryFn: () => listWeightLogs(clinicId, memberId),
    enabled: !!clinicId && !!memberId,
  })
}

export function useSaveWeightLog(clinicId: string, memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: WeightLogInput) => {
      await saveWeightLog(clinicId, memberId, input)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.weightLogs(clinicId, memberId) })
    },
  })
}

export function useRemoveWeightLog(clinicId: string, memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dayKey: string) => removeWeightLog(clinicId, memberId, dayKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.weightLogs(clinicId, memberId) })
    },
  })
}
