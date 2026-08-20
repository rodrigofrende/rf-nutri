import { useQuery } from '@tanstack/react-query'
import { getDashboard, getPlatformStats } from '@/services/dashboardService'
import { queryKeys } from './queryKeys'

export function useClinicDashboard(clinicId: string) {
  return useQuery({
    queryKey: queryKeys.dashboard(clinicId),
    queryFn: () => getDashboard(clinicId),
    enabled: !!clinicId,
    staleTime: 60_000,
  })
}

export function usePlatformStats() {
  return useQuery({
    queryKey: queryKeys.platformStats(),
    queryFn: () => getPlatformStats(),
    staleTime: 60_000,
  })
}
