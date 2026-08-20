import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getClinicPresentation,
  listClinicPresentations,
  updateClinicPresentation,
  type ClinicPresentationUpdate,
} from '@/services/clinicPresentationService'
import { queryKeys } from './queryKeys'

export function useClinicPresentation(clinicId: string) {
  return useQuery({
    queryKey: queryKeys.clinicPresentation(clinicId),
    queryFn: () => getClinicPresentation(clinicId),
    enabled: !!clinicId,
    staleTime: 60_000,
  })
}

/** Perfiles públicos de los clinics de la plataforma (sección clientes de la landing). */
export function useClinicPresentations() {
  return useQuery({
    queryKey: queryKeys.clinicPresentations(),
    queryFn: () => listClinicPresentations(),
    staleTime: 5 * 60_000,
  })
}

export function useUpdateClinicPresentation(clinicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ClinicPresentationUpdate) => updateClinicPresentation(clinicId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clinicPresentation(clinicId) }),
  })
}
