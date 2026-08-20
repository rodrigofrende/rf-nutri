import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MealPlan, Member } from '@/types'
import {
  assignPlanToPatient,
  createMealPlan,
  duplicateMealPlan,
  getMealPlan,
  listMealPlans,
  listPlansForMember,
  removeMealPlan,
  saveAsTemplate,
  updateMealPlan,
} from '@/services/mealPlansService'
import { queryKeys } from './queryKeys'

export function useMealPlans(clinicId: string) {
  return useQuery({
    queryKey: queryKeys.mealPlans(clinicId),
    queryFn: () => listMealPlans(clinicId),
    enabled: !!clinicId,
    staleTime: 30_000,
  })
}

export function useMealPlan(clinicId: string, planId: string) {
  return useQuery({
    queryKey: queryKeys.mealPlan(clinicId, planId),
    queryFn: () => getMealPlan(clinicId, planId),
    enabled: !!clinicId && !!planId,
  })
}

/** Planes del propio paciente (query filtrada por su uid → provably safe). */
export function useMyMealPlans(clinicId: string, memberUid: string) {
  return useQuery({
    queryKey: queryKeys.myMealPlans(clinicId, memberUid),
    queryFn: () => listPlansForMember(clinicId, memberUid),
    enabled: !!clinicId && !!memberUid,
  })
}

function useInvalidatePlans(clinicId: string) {
  const qc = useQueryClient()
  return (planId?: string) => {
    qc.invalidateQueries({ queryKey: queryKeys.mealPlans(clinicId) })
    qc.invalidateQueries({ queryKey: ['mealPlans', clinicId, 'mine'] })
    if (planId) qc.invalidateQueries({ queryKey: queryKeys.mealPlan(clinicId, planId) })
    qc.invalidateQueries({ queryKey: queryKeys.dashboard(clinicId) })
  }
}

export function useCreateMealPlan(clinicId: string) {
  const invalidate = useInvalidatePlans(clinicId)
  return useMutation({
    mutationFn: (data: Omit<MealPlan, 'id'>) => createMealPlan(clinicId, data),
    onSuccess: () => invalidate(),
  })
}

export function useUpdateMealPlan(clinicId: string) {
  const invalidate = useInvalidatePlans(clinicId)
  return useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: Partial<Omit<MealPlan, 'id'>> }) =>
      updateMealPlan(clinicId, planId, data),
    onSuccess: (_r, { planId }) => invalidate(planId),
  })
}

export function useRemoveMealPlan(clinicId: string) {
  const invalidate = useInvalidatePlans(clinicId)
  return useMutation({
    mutationFn: (planId: string) => removeMealPlan(clinicId, planId),
    onSuccess: () => invalidate(),
  })
}

export function useSaveAsTemplate(clinicId: string) {
  const invalidate = useInvalidatePlans(clinicId)
  return useMutation({
    mutationFn: ({ plan, name }: { plan: MealPlan; name?: string }) =>
      saveAsTemplate(clinicId, plan, name),
    onSuccess: () => invalidate(),
  })
}

export function useDuplicateMealPlan(clinicId: string) {
  const invalidate = useInvalidatePlans(clinicId)
  return useMutation({
    mutationFn: ({ plan, name }: { plan: MealPlan; name?: string }) =>
      duplicateMealPlan(clinicId, plan, name),
    onSuccess: () => invalidate(),
  })
}

export function useAssignPlanToPatient(clinicId: string) {
  const invalidate = useInvalidatePlans(clinicId)
  return useMutation({
    mutationFn: ({ planId, member }: { planId: string; member: Pick<Member, 'id' | 'uid'> }) =>
      assignPlanToPatient(clinicId, planId, member),
    onSuccess: (_r, { planId }) => invalidate(planId),
  })
}
