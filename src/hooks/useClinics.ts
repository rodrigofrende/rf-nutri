import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Clinic } from '@/types'
import {
  addClinicAdmin,
  createClinic,
  listClinics,
  removeClinic,
  removeClinicAdmin,
  updateClinic,
} from '@/services/clinicsService'
import { queryKeys } from './queryKeys'

export function useClinics() {
  return useQuery({
    queryKey: queryKeys.clinics(),
    queryFn: () => listClinics(),
    staleTime: 30_000,
  })
}

/** Mutations del super-admin: crear/eliminar clinic y agregar/quitar admins. */
export function useClinicAdminActions() {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.clinics() })
    qc.invalidateQueries({ queryKey: ['memberships'] })
  }

  const create = useMutation({
    mutationFn: (data: Omit<Clinic, 'id'>) => createClinic(data),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (clinicId: string) => removeClinic(clinicId),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: ({ clinicId, data }: { clinicId: string; data: Partial<Omit<Clinic, 'id'>> }) =>
      updateClinic(clinicId, data),
    onSuccess: (_r, { clinicId }) => {
      invalidate()
      qc.invalidateQueries({ queryKey: queryKeys.clinic(clinicId) })
    },
  })
  const addAdmin = useMutation({
    mutationFn: ({ clinicId, uid }: { clinicId: string; uid: string }) => addClinicAdmin(clinicId, uid),
    onSuccess: invalidate,
  })
  const removeAdmin = useMutation({
    mutationFn: ({ clinicId, uid }: { clinicId: string; uid: string }) => removeClinicAdmin(clinicId, uid),
    onSuccess: invalidate,
  })

  return { create, update, remove, addAdmin, removeAdmin }
}
