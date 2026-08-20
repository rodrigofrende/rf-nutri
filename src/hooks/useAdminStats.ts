import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getStats, recomputeStats } from '@/services/statsService'
import { queryKeys } from './queryKeys'

/** Lee el doc agregado de stats con cache largo (query "larga", no se pide seguido). */
export function useAdminStats(clinicId: string) {
  return useQuery({
    queryKey: queryKeys.stats(clinicId),
    queryFn: () => getStats(clinicId),
    enabled: !!clinicId,
    staleTime: 5 * 60_000,
  })
}

/** Recalcula el doc on-demand y refresca el cache. */
export function useRecomputeStats(clinicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => recomputeStats(clinicId),
    onSuccess: (stats) => qc.setQueryData(queryKeys.stats(clinicId), { id: 'summary', ...stats }),
  })
}
