import { orderBy } from 'firebase/firestore'
import type { Member, Role } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { addClinicAdmin, getClinic, removeClinicAdmin } from './clinicsService'
import {
  removeClinicMembershipIndex,
  syncClinicMembershipIndex,
} from './membershipIndexService'
import { listPlans } from './plansService'
import {
  batchSet,
  batchUpdate,
  createBatch,
  getMany,
  getOne,
  newDocId,
  removeOne,
  updateOne,
} from './firestore'
import {
  removeMemberLoginIndexes,
  stageMemberLoginIndex,
  stageMemberLoginIndexDeletes,
} from './memberLoginService'
import { paths } from './paths'
import { canCreateAdmin } from '@/utils/plans'
import { loginEmailKeys, normalizeEmailKey } from '@/utils/loginEmail'

export function listMembers(clinicId: string) {
  if (env.demoMode) return demo.listMembers(clinicId)
  return getMany<Member>(paths.members(clinicId), orderBy('fullName'))
}

export function getMember(clinicId: string, memberId: string) {
  if (env.demoMode) return demo.getMember(clinicId, memberId)
  return getOne<Member>(paths.member(clinicId, memberId))
}

async function syncAdminUid(clinicId: string, uid: string, role: Role, prevRole?: Role) {
  if (!uid) return
  if (role === 'admin' && prevRole !== 'admin') await addClinicAdmin(clinicId, uid)
  if (role !== 'admin' && prevRole === 'admin') await removeClinicAdmin(clinicId, uid)
}

async function assertCanSaveAdmin(clinicId: string, nextRole: Role, currentMemberId?: string) {
  if (nextRole !== 'admin') return
  const [members, clinic, plans] = await Promise.all([listMembers(clinicId), getClinic(clinicId), listPlans()])
  const plan = plans.find((p) => p.id === clinic?.subscription?.planId)
  const currentAdmins = members.filter((m) => m.role === 'admin' && m.id !== currentMemberId).length
  const gate = canCreateAdmin(plan, currentAdmins)
  if (!gate.allowed) throw new Error(gate.reason)
}

/**
 * Evita dos pacientes con el mismo email de acceso en el mismo clinic: el login se
 * indexa por email (`memberLoginIndex/{emailKey}`), así que un duplicado
 * pisaría el índice y rompería el primer login / claim.
 */
async function assertUniqueLoginEmail(clinicId: string, email: string, currentMemberId?: string) {
  const target = normalizeEmailKey(email)
  if (!target) return
  const members = await listMembers(clinicId)
  const clash = members.some(
    (m) => m.id !== currentMemberId && normalizeEmailKey(m.loginEmail || m.email) === target,
  )
  if (clash) throw new Error('Ya existe un paciente con ese email de acceso en este consultorio')
}

/** Alta de un paciente (admin). Crea la invitación: uid vacío hasta que la reclame. */
export async function createMember(clinicId: string, data: Omit<Member, 'id' | 'uid'>) {
  if (env.demoMode) return demo.createMember(clinicId, data)
  await assertCanSaveAdmin(clinicId, data.role)
  await assertUniqueLoginEmail(clinicId, data.loginEmail || data.email)
  const loginEmail = normalizeEmailKey(data.loginEmail || data.email)
  const payload = {
    ...data,
    uid: '',
    email: normalizeEmailKey(data.email || loginEmail),
    loginEmail,
    authStatus: data.authStatus ?? 'pending_password',
  } satisfies Omit<Member, 'id'>
  // Lecturas ANTES de abrir el batch: adentro no se puede leer.
  const clinic = await getClinic(clinicId)
  const memberId = newDocId(paths.members(clinicId))
  // ATÓMICO. Antes eran dos awaits separados (crear el paciente, después indexarlo)
  // y si el segundo fallaba quedaba un paciente EXISTENTE sin índice de login: no
  // podía crear su contraseña nunca, y para el admin parecía dado de alta igual
  // porque aparecía en la lista. Ahora se escriben los dos o ninguno.
  const batch = createBatch()
  batchSet(batch, paths.member(clinicId, memberId), payload)
  stageMemberLoginIndex(batch, clinicId, memberId, payload, clinic?.name ?? 'Consultorio')
  await batch.commit()
  return memberId
}

/** Edición completa de datos por el admin. */
export async function updateMember(clinicId: string, memberId: string, data: Partial<Member>) {
  if (env.demoMode) return demo.updateMember(clinicId, memberId, data)
  const prev = await getMember(clinicId, memberId)
  // Solo validar el cupo de admins cuando REALMENTE se promueve a admin. Un
  // update que no toca el rol (ej. resetear la contraseña de un admin existente)
  // no debe re-chequear el cupo: si el clinic quedó sobre el límite tras bajar de
  // plan, igual se lo debe poder editar sin quedar trabado.
  if (data.role === 'admin' && prev?.role !== 'admin') {
    await assertCanSaveAdmin(clinicId, 'admin', memberId)
  }
  const nextEmail = data.loginEmail ?? data.email
  if (prev && nextEmail && normalizeEmailKey(nextEmail) !== normalizeEmailKey(prev.loginEmail || prev.email)) {
    await assertUniqueLoginEmail(clinicId, nextEmail, memberId)
  }
  const clinic = prev ? await getClinic(clinicId) : null
  // ATÓMICO: el paciente y su índice, juntos. Importa sobre todo cuando cambia el
  // email, porque ahí se borra la clave vieja y se escribe la nueva: separados,
  // un fallo en el medio dejaba al paciente sin ningún índice.
  const batch = createBatch()
  batchUpdate(batch, paths.member(clinicId, memberId), data)
  if (prev) {
    const nextMember = { ...prev, ...data }
    const nextKeys = new Set(loginEmailKeys(nextMember))
    stageMemberLoginIndexDeletes(
      batch,
      loginEmailKeys(prev).filter((key) => !nextKeys.has(key)),
    )
    stageMemberLoginIndex(batch, clinicId, memberId, nextMember, clinic?.name ?? 'Consultorio')
  }
  await batch.commit()
  const nextRole = data.role ?? prev?.role
  const uid = data.uid ?? prev?.uid ?? ''
  if (uid && nextRole) {
    await syncClinicMembershipIndex(uid, clinicId, { memberId, role: nextRole })
    await syncAdminUid(clinicId, uid, nextRole, prev?.role)
  }
}

/**
 * Re-emite el acceso de un paciente con un email NUEVO y lo deja en "primer acceso"
 * (pending_password, sin uid), conservando todos sus datos. Es el blanqueo sin
 * backend: como Firebase no deja resetear la contraseña de una cuenta existente
 * client-only, se emite un login nuevo (que no tiene cuenta) y el paciente crea su
 * contraseña en el primer ingreso, sin saber la anterior. La cuenta vieja queda
 * huérfana e inutilizada.
 */
export async function reissueMemberAccess(clinicId: string, memberId: string, newLoginEmail: string) {
  const email = normalizeEmailKey(newLoginEmail)
  if (env.demoMode) {
    return demo.updateMember(clinicId, memberId, {
      loginEmail: email,
      email,
      authStatus: 'pending_password',
      uid: '',
    })
  }
  const prev = await getMember(clinicId, memberId)
  if (!prev) throw new Error('No encontramos al paciente')
  if (normalizeEmailKey(email) === normalizeEmailKey(prev.loginEmail || prev.email)) {
    throw new Error('El acceso nuevo tiene que ser distinto del actual: Firebase no permite reusar la cuenta anterior.')
  }
  await assertUniqueLoginEmail(clinicId, email, memberId)

  // Limpiar la identidad vieja: índice de membresía y, si era admin, adminUids.
  // La cuenta de Firebase vieja queda huérfana (nadie la usa).
  if (prev.uid) {
    await removeClinicMembershipIndex(prev.uid, clinicId)
    if (prev.role === 'admin') await removeClinicAdmin(clinicId, prev.uid)
  }
  const clinic = await getClinic(clinicId)
  const nextMember = {
    ...prev,
    loginEmail: email,
    email,
    authStatus: 'pending_password' as const,
    uid: '',
  }

  // ATÓMICO, y acá es lo más crítico de todo: antes se borraba el índice viejo y
  // DESPUÉS se escribía el nuevo, en dos awaits. Un fallo en el medio dejaba al
  // paciente sin NINGÚN índice — o sea sin poder entrar ni crear contraseña — y el
  // blanqueo es justo lo que un admin usa cuando un paciente no puede entrar, así
  // que el intento de arreglarlo podía dejarlo peor.
  //
  // Los borrados excluyen las claves que se van a reescribir, para no depender
  // del orden de operaciones sobre el mismo doc dentro del batch.
  const nextKeys = new Set(loginEmailKeys(nextMember))
  const batch = createBatch()
  batchUpdate(batch, paths.member(clinicId, memberId), {
    loginEmail: email,
    email,
    authStatus: 'pending_password',
    uid: '',
  })
  stageMemberLoginIndexDeletes(
    batch,
    loginEmailKeys(prev).filter((key) => !nextKeys.has(key)),
  )
  stageMemberLoginIndex(batch, clinicId, memberId, nextMember, clinic?.name ?? 'Consultorio')
  await batch.commit()
}

/** Edición acotada de datos personales (usada por el propio paciente). */
export function updateMemberProfile(
  clinicId: string,
  memberId: string,
  data: Pick<Member, 'fullName' | 'phone' | 'birthDate' | 'photoURL'>,
) {
  if (env.demoMode) return demo.updateMemberProfile(clinicId, memberId, data)
  return updateOne(paths.member(clinicId, memberId), data)
}

export async function removeMember(clinicId: string, memberId: string) {
  if (env.demoMode) return demo.removeMember(clinicId, memberId)
  const prev = await getMember(clinicId, memberId)
  if (prev?.uid) {
    await removeClinicMembershipIndex(prev.uid, clinicId)
    if (prev.role === 'admin') await removeClinicAdmin(clinicId, prev.uid)
  }
  if (prev) await removeMemberLoginIndexes(prev)
  return removeOne(paths.member(clinicId, memberId))
}
