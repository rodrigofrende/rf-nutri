import type { CSSProperties } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { useClinicPresentation } from '@/hooks/useClinicPresentation'
import { buildThemeVars, PLATFORM_DEFAULT_THEME } from '@/utils/theme'
import { FullPageSpinner } from '@/components/ui'
import { PublicClinicView } from '@/features/clinic-presentation/PublicClinicView'

/**
 * Página pública de presentación del consultorio (`/n/:clinicId`). 100% anónima: no
 * usa AppLayout (la Sidebar necesita tenant) y aplica el theme del consultorio de
 * forma local vía inline style, sin contaminar `:root`. Lee `publicProfiles/{clinicId}`,
 * legible sin login. El look "Athletic Bold" vive en PublicClinicView.
 */
export function PublicClinicPage() {
  const { clinicId } = useParams()
  const { data, isLoading } = useClinicPresentation(clinicId ?? '')

  if (!clinicId) return <Navigate to="/" replace />
  if (isLoading) return <FullPageSpinner />

  const themeStyle = buildThemeVars(data?.theme ?? PLATFORM_DEFAULT_THEME) as CSSProperties

  if (!data) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-zinc-950 px-6 text-center text-white">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-white/5 text-zinc-400">
          <Building2 className="size-7" />
        </div>
        <h1 className="mt-4 text-xl font-bold">Consultorio no encontrado</h1>
        <p className="mt-1 max-w-sm text-sm text-zinc-400">
          Es posible que el enlace sea incorrecto o que el consultorio todavía no haya publicado su
          presentación.
        </p>
      </div>
    )
  }

  return (
    <div style={themeStyle} className="min-h-full bg-zinc-950">
      <PublicClinicView data={data} clinicName={data.name} />
    </div>
  )
}
