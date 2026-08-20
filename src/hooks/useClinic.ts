import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Clinic } from '@/types'
import { getClinic, updateClinicBranding, type ClinicBrandingUpdate } from '@/services/clinicsService'
import { updateClinicPresentation } from '@/services/clinicPresentationService'
import { queryKeys } from './queryKeys'

export function useClinic(clinicId: string) {
  return useQuery({
    queryKey: queryKeys.clinic(clinicId),
    queryFn: () => getClinic(clinicId),
    enabled: !!clinicId,
    staleTime: 60_000,
  })
}

/**
 * Guarda el branding del clinic. Invalida el clinic y las membresías (de donde el
 * theme se lee y aplica), para que el cambio se refleje al instante. Además
 * refresca el snapshot de marca del perfil público (`publicProfiles/{clinicId}`)
 * para que la página pública/del paciente no quede con la marca vieja.
 */
export function useUpdateClinicBranding(clinicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ClinicBrandingUpdate) => updateClinicBranding(clinicId, data),
    onSuccess: async (_res, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.clinic(clinicId) })
      qc.invalidateQueries({ queryKey: ['memberships'] })
      const clinic = qc.getQueryData<Clinic | null>(queryKeys.clinic(clinicId))
      // Espejo explícito del snapshot de marca: los campos de rate-limit del logo
      // no viajan a publicProfiles (la whitelist de las rules los rechazaría).
      // logoURL: null → deleteField en clinics y publicProfiles (evita `""`).
      const mirror: Parameters<typeof updateClinicPresentation>[1] = { name: clinic?.name }
      if (variables.theme !== undefined) mirror.theme = variables.theme
      if (variables.logoURL !== undefined) mirror.logoURL = variables.logoURL
      await updateClinicPresentation(clinicId, mirror)
      qc.invalidateQueries({ queryKey: queryKeys.clinicPresentation(clinicId) })
    },
  })
}
