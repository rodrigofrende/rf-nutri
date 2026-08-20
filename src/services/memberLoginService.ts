import { deleteDoc, doc, setDoc, type WriteBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { env } from '@/config/env'
import type { Clinic, Member, MemberAuthStatus, MemberLoginIndex } from '@/types'
import {
  emailTypoCandidates,
  isPublicEmailProvider,
  loginEmailKeys,
  normalizeEmailKey,
} from '@/utils/loginEmail'
import { extractFirestoreCode } from '@/utils/firestoreErrors'
import { reportOperational } from '@/utils/errorReporting'
import * as demo from '@/demo/store'
import { batchDelete, batchSet, getOne, getOneFromServer, updateOne } from './firestore'
import { getClinic } from './clinicsService'
import { paths } from './paths'

export function getMemberLogin(email: string): Promise<MemberLoginIndex | null> {
  if (env.demoMode) return demo.getMemberLogin(email)
  // getOneFromServer y NO getOne: acá `null` decide si el paciente "no está dado de
  // alta", así que no puede venir de la caché. Sin red esto TIRA en vez de dar un
  // falso negativo — ver el comentario en firestore.ts.
  return getOneFromServer<MemberLoginIndex>(paths.memberLoginIndex(normalizeEmailKey(email)))
}

export const LOGIN_INDEX_MISSING_MESSAGE =
  'Este email no está dado de alta. Pedile a tu consultorio que te agregue, o usá el email de acceso que te dieron.'

// A propósito NO afirma que el acceso sea un alias del clinic: hay consultorios que dan
// de alta a sus pacientes con el email personal (en TigerFit, 4 de 7 asistencias de
// una noche eran gmail/hotmail). Decirle "tu acceso es nombre@tuconsultorio.com"
// sería mandarlo a buscar algo que quizá no existe.
export const PERSONAL_EMAIL_MESSAGE =
  'No encontramos ese email. Si el consultorio te dio un usuario de acceso, probá con ese; si no, pedile que te dé de alta.'

// Redactado para servir con y sin botón de sugerencia en pantalla (LoginPage lo
// muestra; SetPasswordPage, al que se llega por deep-link, no).
export const EMAIL_TYPO_MESSAGE =
  'Ese email no está dado de alta. Revisá el dominio: parece que tiene un error de tipeo.'

/** Por qué un email no resolvió a ningún paciente. */
export type LoginMissReason = 'typo-corregible' | 'proveedor-publico' | 'no-existe'

export interface LoginMiss {
  reason: LoginMissReason
  /** Email corregido que SÍ existe en el índice. Sólo en 'typo-corregible'. */
  suggestion?: string
}

/**
 * Diagnostica un miss del índice de login, para elegir qué se le dice al paciente y
 * para clasificar el aviso al dueño.
 *
 * El caso 'typo-corregible' se confirma contra el índice: la sugerencia sólo
 * existe si el email corregido está dado de alta de verdad, así que nunca se le
 * ofrece al paciente un email inventado. No filtra nada nuevo — confirmar que ese
 * doc existe ya es posible con el `get` público del índice.
 */
export async function diagnoseLoginMiss(email: string): Promise<LoginMiss> {
  for (const candidate of emailTypoCandidates(email)) {
    try {
      if (await getMemberLogin(candidate)) return { reason: 'typo-corregible', suggestion: candidate }
    } catch {
      // Sin red no se puede confirmar ninguna sugerencia: cortamos y seguimos
      // con el diagnóstico estático, que no necesita leer nada.
      break
    }
  }
  if (isPublicEmailProvider(email)) return { reason: 'proveedor-publico' }
  return { reason: 'no-existe' }
}

/** Mensaje para el paciente según el diagnóstico. */
export function loginMissMessage(miss: LoginMiss): string {
  if (miss.reason === 'typo-corregible') return EMAIL_TYPO_MESSAGE
  if (miss.reason === 'proveedor-publico') return PERSONAL_EMAIL_MESSAGE
  return LOGIN_INDEX_MISSING_MESSAGE
}

export async function syncMemberLoginIndex(
  clinicId: string,
  memberId: string,
  member: Omit<Member, 'id'> | Member,
  clinic?: Pick<Clinic, 'name'> | null,
) {
  if (env.demoMode) return demo.syncMemberLoginIndex(clinicId, memberId, member)
  const clinicData = clinic ?? (await getClinic(clinicId))
  const emails = loginEmailKeys(member)
  // OVERWRITE (sin merge): el índice de login es world-readable y las rules lo
  // validan con hasOnly([4 claves]). Un merge conservaría claves legacy de docs
  // viejos y rompería esa validación → "permiso denegado". Sobrescribir garantiza
  // que el doc quede exactamente con las 4 claves permitidas. NO se guarda
  // authStatus (no filtrar qué pacientes están sin reclamar).
  //
  // `email` del payload DEBE coincidir con la clave del doc (rules: emailKey ==
  // email.lower()). Por eso indexamos la versión ya normalizada, y si el paciente
  // tiene email de contacto distinto al de acceso, publicamos ambas claves.
  await Promise.all(
    emails.map((email) =>
      setDoc(doc(db, paths.memberLoginIndex(email)), {
        email,
        clinicId,
        clinicName: clinicData?.name ?? 'Consultorio',
        memberId,
      } satisfies Omit<MemberLoginIndex, 'id'>),
    ),
  )
}

/**
 * Prepara las escrituras del índice SOBRE UN BATCH, para que el doc del paciente y
 * su índice se escriban —o fallen— juntos. Misma forma exacta que
 * `syncMemberLoginIndex` (overwrite sin merge, ver el comentario de arriba).
 *
 * Pide el `clinicName` ya resuelto porque dentro de un batch no se puede leer: el
 * caller tiene que hacer el `getClinic` ANTES de abrirlo.
 */
export function stageMemberLoginIndex(
  batch: WriteBatch,
  clinicId: string,
  memberId: string,
  member: Omit<Member, 'id'> | Member,
  clinicName: string,
) {
  for (const email of loginEmailKeys(member)) {
    batchSet(batch, paths.memberLoginIndex(email), {
      email,
      clinicId,
      clinicName,
      memberId,
    } satisfies Omit<MemberLoginIndex, 'id'>)
  }
}

/** Borra claves del índice sobre un batch. Los emails se normalizan acá. */
export function stageMemberLoginIndexDeletes(batch: WriteBatch, emails: string[]) {
  for (const email of emails) {
    batchDelete(batch, paths.memberLoginIndex(normalizeEmailKey(email)))
  }
}

export async function removeMemberLoginIndex(email: string) {
  if (env.demoMode) return demo.removeMemberLoginIndex(email)
  await deleteDoc(doc(db, paths.memberLoginIndex(normalizeEmailKey(email))))
}

export async function removeMemberLoginIndexes(member: { email?: string; loginEmail?: string }) {
  await Promise.all(loginEmailKeys(member).map(removeMemberLoginIndex))
}

/** Re-publica el índice de login de todos los pacientes del clinic (backfill). */
export async function ensureClinicLoginIndexes(clinicId: string, members: Member[]) {
  if (env.demoMode || members.length === 0) return
  const clinic = await getClinic(clinicId)
  const chunkSize = 10
  let failed = 0
  let firstCode = ''
  for (let i = 0; i < members.length; i += chunkSize) {
    const chunk = members.slice(i, i + chunkSize)
    // allSettled y NO all: con `all`, un solo rechazo tiraba la función entera y
    // se salteaban TODOS los chunks siguientes, dejando pacientes sin indexar — y
    // sin ninguna señal, porque el caller se come el error. Hay un fallo
    // permanente esperable: las rules prohíben re-apuntar un índice existente a
    // otro clinic, así que el mismo email real en dos clinics queda denegado siempre.
    const results = await Promise.allSettled(
      chunk.map((member) => syncMemberLoginIndex(clinicId, member.id, member, clinic)),
    )
    for (const result of results) {
      if (result.status !== 'rejected') continue
      failed++
      if (!firstCode) firstCode = extractFirestoreCode(result.reason) ?? 'unknown'
    }
  }
  if (failed > 0) {
    reportOperational(
      'login-index-backfill',
      'Quedaron pacientes sin índice de login',
      `${failed}/${members.length} fallaron · ${firstCode}`,
      { clinic: clinicId },
    )
  }
}

export async function updateMemberAuthStatus(
  clinicId: string,
  memberId: string,
  authStatus: MemberAuthStatus,
  extra: Partial<Pick<Member, 'passwordUpdatedAt' | 'passwordResetRequestedAt'>> = {},
  // Datos ya leídos por el caller (ej. el claim del login): evita el getOne del
  // member y el getClinic del índice — 2 round-trips menos en el primer acceso.
  preloaded: { member?: Member; clinicName?: string } = {},
) {
  if (env.demoMode) return demo.updateMemberAuthStatus(clinicId, memberId, authStatus, extra)
  const member = preloaded.member ?? (await getOne<Member>(paths.member(clinicId, memberId)))
  if (!member) throw new Error('member-not-found')
  await updateOne(paths.member(clinicId, memberId), { authStatus, ...extra })
  await syncMemberLoginIndex(
    clinicId,
    memberId,
    { ...member, authStatus, ...extra },
    preloaded.clinicName ? { name: preloaded.clinicName } : undefined,
  )
}
