import { useQueries } from '@tanstack/react-query'
import type { Clinic } from '@/types'
import { listMembers } from '@/services/membersService'
import { queryKeys } from './queryKeys'

/**
 * Cuenta de admins reales por clinic: members con `role === 'admin'` (la fuente de
 * verdad, igual que SuperClinicsPage). El array denormalizado `clinic.adminUids` NO
 * sirve para esto: `syncAdminUid` lo omite mientras el admin invitado no
 * reclamó su cuenta (uid vacío), así que queda desactualizado.
 * Usa la misma query key que useMembers → comparte cache, sin lecturas extra.
 */
export function useClinicAdminCounts(clinics: Clinic[]) {
  const results = useQueries({
    queries: clinics.map((g) => ({
      queryKey: queryKeys.members(g.id),
      queryFn: () => listMembers(g.id),
      staleTime: 30_000,
    })),
  })

  const byClinic = new Map<string, number>()
  clinics.forEach((g, i) => {
    const members = results[i]?.data
    if (members) byClinic.set(g.id, members.filter((m) => m.role === 'admin').length)
  })
  const total = [...byClinic.values()].reduce((sum, n) => sum + n, 0)
  const isLoading = results.some((r) => r.isLoading)

  return { byClinic, total, isLoading }
}
