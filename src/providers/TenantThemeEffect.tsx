import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useOptionalTenant } from '@/providers/TenantProvider'
import { applyTenantTheme } from '@/utils/theme'

/**
 * Aplica el branding del tenant activo a las variables CSS de `:root`.
 * En el área de plataforma (`/super/*`, RF Clinic) y fuera de un tenant rige la
 * marca general default; el branding del clinic solo aparece al entrar a un clinic.
 * Vive fuera de TenantProvider para mantener ese provider puro (sin efectos).
 */
export function TenantThemeEffect() {
  const tenant = useOptionalTenant()
  const { pathname } = useLocation()
  const isPlatform = pathname.startsWith('/super')
  const theme = isPlatform ? null : (tenant?.activeMembership?.clinicTheme ?? null)

  useEffect(() => {
    applyTenantTheme(theme)
    return () => applyTenantTheme(null)
  }, [theme])

  return null
}
