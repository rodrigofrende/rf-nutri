import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SubscriptionPlan } from '@/types'
import { createPlan, listPlans, removePlan, updatePlan } from '@/services/plansService'
import { queryKeys } from './queryKeys'

export function usePlans() {
  return useQuery({
    queryKey: queryKeys.plans(),
    queryFn: () => listPlans(),
    staleTime: 60_000,
  })
}

export function useCreatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<SubscriptionPlan, 'id'>) => createPlan(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.plans() }),
  })
}

export function useUpdatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: Partial<SubscriptionPlan> }) =>
      updatePlan(planId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.plans() }),
  })
}

export function useRemovePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (planId: string) => removePlan(planId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.plans() }),
  })
}
