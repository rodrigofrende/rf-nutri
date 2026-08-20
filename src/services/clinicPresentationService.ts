import { deleteField, limit, serverTimestamp } from 'firebase/firestore'
import type { ClinicPresentation } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { getMany, getOne, setOne } from './firestore'
import { paths } from './paths'

export function getClinicPresentation(clinicId: string) {
  if (env.demoMode) return demo.getClinicPresentation(clinicId)
  return getOne<ClinicPresentation>(paths.publicProfile(clinicId))
}

/**
 * Perfiles públicos para la sección "Nuestros clientes" de la landing.
 * `publicProfiles` es world-readable, así que no requiere rules nuevas.
 * OJO: los docs traen el logo inline → se limita la cantidad; si la plataforma
 * escala a muchos consultorios, migrar a un doc directorio liviano.
 */
export function listClinicPresentations(max = 8) {
  if (env.demoMode) return demo.listClinicPresentations()
  return getMany<ClinicPresentation>(paths.publicProfiles(), limit(max))
}

export interface ClinicPresentationUpdate extends Partial<Omit<ClinicPresentation, 'id' | 'logoURL'>> {
  /** Data URL del logo; `null` borra el campo (no dejar `""`, que rompe las rules). */
  logoURL?: string | null
}

/**
 * Crea o actualiza la presentación pública del consultorio. Usa `setOne` (merge)
 * porque el doc puede no existir todavía. El caller debe incluir el snapshot de
 * marca (name/logoURL/theme) para que la página pública renderice branded sin
 * leer el doc protegido `clinics/{clinicId}`.
 */
export function updateClinicPresentation(clinicId: string, data: ClinicPresentationUpdate) {
  const { logoURL, ...rest } = data
  if (env.demoMode) {
    if (logoURL === null) demo.clearClinicPresentationLogo(clinicId)
    return demo.updateClinicPresentation(clinicId, {
      ...rest,
      ...(logoURL !== undefined && logoURL !== null ? { logoURL } : {}),
    })
  }
  return setOne(paths.publicProfile(clinicId), {
    ...rest,
    ...(logoURL === null
      ? { logoURL: deleteField() }
      : logoURL !== undefined
        ? { logoURL }
        : {}),
    updatedAt: serverTimestamp(),
  })
}
