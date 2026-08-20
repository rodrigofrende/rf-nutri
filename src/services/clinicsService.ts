import { arrayRemove, arrayUnion, deleteField, serverTimestamp } from 'firebase/firestore'
import type { Clinic, ClinicSettings } from '@/types'
import { DEFAULT_CLINIC_SETTINGS } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { addToCollection, getMany, getOne, removeOne, updateOne } from './firestore'
import { paths } from './paths'

export function getClinic(clinicId: string) {
  if (env.demoMode) return demo.getClinic(clinicId)
  return getOne<Clinic>(paths.clinic(clinicId))
}

export function listClinics() {
  if (env.demoMode) return demo.listClinics()
  return getMany<Clinic>(paths.clinics())
}

/** Alta de consultorio (super-admin). Nace con la configuración default: todo habilitado. */
export function createClinic(data: Omit<Clinic, 'id'>) {
  const payload = { settings: DEFAULT_CLINIC_SETTINGS, ...data }
  if (env.demoMode) return demo.createClinic(payload)
  return addToCollection(paths.clinics(), payload)
}

/**
 * Configuración de trabajo del consultorio (qué mostrar/habilitar). La edita el
 * admin: entra por la rama adminSafeClinicUpdate de las rules (no toca
 * subscription/ownerUid).
 */
export function updateClinicSettings(clinicId: string, settings: ClinicSettings) {
  if (env.demoMode) return demo.updateClinic(clinicId, { settings })
  return updateOne(paths.clinic(clinicId), { settings })
}

export function updateClinic(clinicId: string, data: Partial<Omit<Clinic, 'id'>>) {
  if (env.demoMode) return demo.updateClinic(clinicId, data)
  return updateOne(paths.clinic(clinicId), data)
}

export function removeClinic(clinicId: string) {
  if (env.demoMode) return demo.removeClinic(clinicId)
  return removeOne(paths.clinic(clinicId))
}

export interface ClinicBrandingUpdate extends Partial<Pick<Clinic, 'theme' | 'logoChangeCount'>> {
  /** Data URL del logo; `null` borra el campo (no dejar `""`, que rompe las rules). */
  logoURL?: string | null
  /** true → estampa el inicio de una nueva ventana de 24hs de cambios de logo. */
  startLogoWindow?: boolean
}

/**
 * Actualiza el branding del clinic (paleta y/o logo). Cuando cambia el logo, el
 * caller debe mandar `logoChangeCount` (y `startLogoWindow` si la ventana de
 * 24hs venció): firestore.rules valida el límite de 3 cambios por día.
 */
export function updateClinicBranding(clinicId: string, data: ClinicBrandingUpdate) {
  const { startLogoWindow, logoURL, ...rest } = data
  if (env.demoMode) {
    if (logoURL === null) demo.clearClinicLogo(clinicId)
    return demo.updateClinic(clinicId, {
      ...rest,
      ...(logoURL !== undefined && logoURL !== null ? { logoURL } : {}),
      ...(startLogoWindow ? { logoWindowStart: new Date() } : {}),
    })
  }
  return updateOne(paths.clinic(clinicId), {
    ...rest,
    ...(logoURL === null
      ? { logoURL: deleteField() }
      : logoURL !== undefined
        ? { logoURL }
        : {}),
    ...(startLogoWindow ? { logoWindowStart: serverTimestamp() } : {}),
  })
}

export function addClinicAdmin(clinicId: string, uid: string) {
  if (env.demoMode) return demo.addClinicAdmin(clinicId, uid)
  return updateOne(paths.clinic(clinicId), { adminUids: arrayUnion(uid) })
}

export function removeClinicAdmin(clinicId: string, uid: string) {
  if (env.demoMode) return demo.removeClinicAdmin(clinicId, uid)
  return updateOne(paths.clinic(clinicId), { adminUids: arrayRemove(uid) })
}
