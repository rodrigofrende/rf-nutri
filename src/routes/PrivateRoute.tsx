import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { Role } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { FullPageSpinner } from '@/components/ui'
import { UnauthorizedPage } from '@/features/auth/UnauthorizedPage'
import { ROUTES } from './routePaths'

/**
 * Guard de auth + rol. Verifica en orden:
 *   1. auth inicializada → 2. usuario logueado → 3. clinic activo → 4. rol permitido.
 */
export function PrivateRoute({
  children,
  allowedRoles,
}: {
  children: ReactNode
  allowedRoles: Role[]
}) {
  const { user, isInitialized } = useAuth()
  const { isLoading, activeClinicId, role } = useTenant()

  if (!isInitialized || isLoading) return <FullPageSpinner />
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />
  if (!activeClinicId || !role) return <Navigate to={ROUTES.SELECT_CLINIC} replace />
  if (!allowedRoles.includes(role)) return <UnauthorizedPage />
  return <>{children}</>
}

/**
 * Guard del panel super-admin: requiere auth + capacidad global de super-admin.
 * NO requiere clinic activo (el panel es global, cross-tenant).
 */
export function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { user, isInitialized, claimsResolved } = useAuth()
  const { isLoading, isSuperAdmin } = useTenant()

  // claimsResolved: el claim de super-admin se resuelve async post-init; esperamos
  // acá (solo /super/*) para no mostrar Unauthorized por un estado intermedio.
  if (!isInitialized || isLoading || !claimsResolved) return <FullPageSpinner />
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />
  if (!isSuperAdmin) return <UnauthorizedPage />
  return <>{children}</>
}
