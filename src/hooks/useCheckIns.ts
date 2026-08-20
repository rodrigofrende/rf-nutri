import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listCheckIns,
  removeCheckIn,
  saveCheckIn,
  type CheckInInput,
} from '@/services/checkInsService'
import { queryKeys } from './queryKeys'

export function useCheckIns(clinicId: string, memberId: string) {
  return useQuery({
    queryKey: queryKeys.checkIns(clinicId, memberId),
    queryFn: () => listCheckIns(clinicId, memberId),
    enabled: !!clinicId && !!memberId,
  })
}

export function useSaveCheckIn(clinicId: string, memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CheckInInput) => {
      await saveCheckIn(clinicId, memberId, input)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.checkIns(clinicId, memberId) })
    },
  })
}

export function useRemoveCheckIn(clinicId: string, memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (weekKey: string) => removeCheckIn(clinicId, memberId, weekKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.checkIns(clinicId, memberId) })
    },
  })
}
