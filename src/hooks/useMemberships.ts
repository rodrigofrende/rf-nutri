import { useQuery } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import { listMembershipsForUser } from '@/services/membershipsService'
import { queryKeys } from './queryKeys'

/**
 * Lista las membresías ya sincronizadas del usuario.
 * Las mutaciones de claim se hacen explícitamente en login / crear contraseña.
 */
export function useMemberships(user: User | null | undefined, isSuperAdmin: boolean) {
  return useQuery({
    queryKey: [...queryKeys.memberships(user?.uid ?? ''), isSuperAdmin],
    queryFn: async () => {
      return listMembershipsForUser((user as User).uid, isSuperAdmin)
    },
    enabled: !!user?.uid,
    // Las mutaciones que cambian membresías invalidan ['memberships'] explícitamente;
    // sin staleTime, cada transición de ruta del login re-dispara el listado completo
    // (1 + 2×N reads) y en mobile eso se siente como espera muerta.
    staleTime: 60_000,
  })
}
