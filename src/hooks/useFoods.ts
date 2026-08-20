import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Food } from '@/types'
import { createFood, importSeedFoods, listFoods, removeFood, updateFood } from '@/services/foodsService'
import { queryKeys } from './queryKeys'

export function useFoods(clinicId: string) {
  return useQuery({
    queryKey: queryKeys.foods(clinicId),
    queryFn: () => listFoods(clinicId),
    enabled: !!clinicId,
    staleTime: 60_000,
  })
}

export function useCreateFood(clinicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Food, 'id'>) => createFood(clinicId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.foods(clinicId) }),
  })
}

export function useUpdateFood(clinicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ foodId, data }: { foodId: string; data: Partial<Omit<Food, 'id'>> }) =>
      updateFood(clinicId, foodId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.foods(clinicId) }),
  })
}

export function useRemoveFood(clinicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (foodId: string) => removeFood(clinicId, foodId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.foods(clinicId) }),
  })
}

/** Importa el catálogo base (idempotente: saltea los ya existentes). */
export function useImportSeedFoods(clinicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (createdBy: string) => importSeedFoods(clinicId, createdBy),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.foods(clinicId) }),
  })
}
