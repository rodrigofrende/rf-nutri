import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAnthropometryRecord,
  listAnthropometry,
  removeAnthropometryRecord,
  updateAnthropometryRecord,
  type NewAnthropometryRecord,
} from '@/services/anthropometryService'
import { queryKeys } from './queryKeys'

export function useAnthropometry(clinicId: string, memberId: string) {
  return useQuery({
    queryKey: queryKeys.anthropometry(clinicId, memberId),
    queryFn: () => listAnthropometry(clinicId, memberId),
    enabled: !!clinicId && !!memberId,
  })
}

export function useCreateAnthropometryRecord(clinicId: string, memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: NewAnthropometryRecord) =>
      createAnthropometryRecord(clinicId, memberId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.anthropometry(clinicId, memberId) })
    },
  })
}

export function useUpdateAnthropometryRecord(clinicId: string, memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ recordId, data }: { recordId: string; data: Partial<NewAnthropometryRecord> }) =>
      updateAnthropometryRecord(clinicId, memberId, recordId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.anthropometry(clinicId, memberId) })
    },
  })
}

export function useRemoveAnthropometryRecord(clinicId: string, memberId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (recordId: string) => removeAnthropometryRecord(clinicId, memberId, recordId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.anthropometry(clinicId, memberId) })
    },
  })
}
