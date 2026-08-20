import { orderBy, serverTimestamp } from 'firebase/firestore'
import type { BlockedEmail } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { batchDelete, batchSet, createBatch, getMany, removeOne } from './firestore'
import { normalizeEmailKey } from '@/utils/loginEmail'
import { paths } from './paths'

/**
 * Emails vetados de la plataforma. Sólo el super-admin lee y escribe esta lista
 * (ver `match /blockedEmails` en firestore.rules).
 *
 * El veto NO se chequea desde el cliente: las rules lo hacen cumplir con
 * `isBlockedEmail()`, que puede consultar la colección aunque esté cerrada
 * porque las rules leen con privilegios propios. Eso deja la lista sin exponer y
 * evita que se pueda enumerar quién está vetado.
 */

export function listBlockedEmails() {
  if (env.demoMode) return demo.listBlockedEmails()
  return getMany<BlockedEmail>(paths.blockedEmails(), orderBy('createdAt', 'desc'))
}

/**
 * Veta un email. Dos escrituras en UN batch:
 *  1. el doc del veto, que es lo que las rules consultan de ahí en adelante;
 *  2. el borrado de su `memberLoginIndex`, que es lo que corta a un paciente que YA
 *     estaba dado de alta.
 *
 * Van juntas a propósito: vetar sin borrar el índice deja el veto a medias (el
 * paciente existente sigue resolviendo su clinic y entrando), y borrar el índice sin
 * vetar lo deja reaparecer en el próximo backfill de la lista de pacientes.
 *
 * Lo que esto NO hace: cerrar una sesión ya abierta. Sin Admin SDK no se puede
 * deshabilitar la cuenta de Firebase Auth, así que un vetado con la app abierta
 * sigue hasta que cierre sesión.
 */
export function blockEmail(email: string, reason?: string) {
  const key = normalizeEmailKey(email)
  if (!key) throw new Error('Ingresá un email')
  if (env.demoMode) return demo.blockEmail(key, reason)

  const batch = createBatch()
  batchSet(batch, paths.blockedEmail(key), {
    email: key,
    // Sin `reason: undefined`: las rules validan con hasOnly y el doc queda más
    // limpio sin la clave que con la clave vacía.
    ...(reason?.trim() ? { reason: reason.trim().slice(0, 300) } : {}),
    createdAt: serverTimestamp(),
  })
  batchDelete(batch, paths.memberLoginIndex(key))
  return batch.commit()
}

/**
 * Levanta el veto. NO recrea el índice de login: si el email pertenecía a un
 * paciente, su acceso se restablece cuando un admin abre la lista de pacientes (el
 * backfill lo republica) o al editarlo. Es a propósito — recrear el índice acá
 * exigiría adivinar a qué clinic pertenecía.
 */
export function unblockEmail(emailKey: string) {
  if (env.demoMode) return demo.unblockEmail(emailKey)
  return removeOne(paths.blockedEmail(normalizeEmailKey(emailKey)))
}
