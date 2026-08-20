import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Tariff } from '@/types'
import { createTariff, listTariffs, removeTariff, updateTariff } from '@/services/tariffsService'
import { queryKeys } from './queryKeys'

export function useTariffs(clinicId: string) {
  return useQuery({
    queryKey: queryKeys.tariffs(clinicId),
    queryFn: () => listTariffs(clinicId),
    enabled: !!clinicId,
    staleTime: 60_000,
  })
}

export function useCreateTariff(clinicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Tariff, 'id'>) => createTariff(clinicId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tariffs(clinicId) }),
  })
}

export function useUpdateTariff(clinicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tariffId, data }: { tariffId: string; data: Partial<Tariff> }) =>
      updateTariff(clinicId, tariffId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tariffs(clinicId) }),
  })
}

export function useRemoveTariff(clinicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tariffId: string) => removeTariff(clinicId, tariffId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tariffs(clinicId) }),
  })
}
