import {
  collectionGroup,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from '@/lib/firebase'
import type { Clinic, Member, Membership, Role } from '@/types'
import { env } from '@/config/env'
import { syncClinicMembershipIndex, type ClinicMembershipIndex } from './membershipIndexService'
import { listClinics } from './clinicsService'
import { getMany } from './firestore'
import { paths } from './paths'
import * as demo from '@/demo/store'

export interface ClaimedMembership {
  clinicId: string
  memberId: string
  role: Role
  /** Member ya leído durante el claim: evita re-leerlo en el flujo de login. */
  member?: Member
}

/**
 * Reclama las invitaciones pendientes del usuario: busca membresías creadas por
 * un admin con su email y todavía sin `uid`, y las enlaza a su cuenta. Se corre
 * al loguearse, antes de listar las membresías.
 */
export async function claimPendingMemberships(user: User): Promise<ClaimedMembership[]> {
  if (env.demoMode) return []
  if (!user.email) return []
  const q = query(
    collectionGroup(db, 'members'),
    where('email', '==', user.email),
    where('uid', '==', ''),
  )
  const snap = await getDocs(q)
  const claimed = await Promise.all(
    snap.docs.map(async (d) => {
      const clinicId = d.ref.parent.parent?.id
      if (!clinicId) return null
      const member = d.data() as Member
      await updateDoc(d.ref, { uid: user.uid })
      await syncClinicMembershipIndex(user.uid, clinicId, {
        memberId: d.id,
        role: member.role,
      })
      return { clinicId, memberId: d.id, role: member.role, member } satisfies ClaimedMembership
    }),
  )
  return claimed.filter((m) => m !== null) as ClaimedMembership[]
}

export async function claimMembership(user: User, clinicId: string, memberId: string): Promise<ClaimedMembership | null> {
  if (env.demoMode) return null
  if (!user.email) return null

  const memberRef = doc(db, 'clinics', clinicId, 'members', memberId)
  const snap = await getDoc(memberRef)
  if (!snap.exists()) throw new Error('member-not-found')

  const member = snap.data() as Member
  if (member.uid && member.uid !== user.uid) throw new Error('member-already-claimed')
  if (!member.uid) await updateDoc(memberRef, { uid: user.uid })

  await syncClinicMembershipIndex(user.uid, clinicId, {
    memberId,
    role: member.role,
  })
  return { clinicId, memberId, role: member.role, member }
}

/** Trae todas las membresías ya reclamadas del usuario, en todos los clinics. */
export async function listMembershipsForUser(
  uid: string,
  isSuperAdmin: boolean,
): Promise<Membership[]> {
  if (env.demoMode) return demo.listMembershipsForUser(uid, isSuperAdmin)

  if (isSuperAdmin) {
    const clinics = await listClinics()
    return clinics.map(
      (g) =>
        ({
          clinicId: g.id,
          memberId: uid,
          clinicName: g.name,
          clinicLogoURL: g.logoURL,
          clinicTheme: g.theme,
          role: 'admin' as Role,
        }) satisfies Membership,
    )
  }

  const indexedMemberships = await getMany<ClinicMembershipIndex & { id: string }>(paths.userClinicMemberships(uid))
  if (indexedMemberships.length) {
    const memberships = await Promise.all(
      indexedMemberships.map(async (index) => {
        const clinicId = index.id
        const [memberSnap, clinicSnap] = await Promise.all([
          getDoc(doc(db, paths.member(clinicId, index.memberId))),
          getDoc(doc(db, paths.clinic(clinicId))),
        ])
        const member = memberSnap.data() as Member | undefined
        const clinic = clinicSnap.data() as Omit<Clinic, 'id'> | undefined
        return {
          clinicId,
          memberId: index.memberId,
          clinicName: clinic?.name ?? 'Consultorio',
          clinicLogoURL: clinic?.logoURL,
          clinicTheme: clinic?.theme,
          role: (member?.role ?? index.role) as Role,
        } satisfies Membership
      }),
    )
    return memberships
  }

  const q = query(collectionGroup(db, 'members'), where('uid', '==', uid))
  const snap = await getDocs(q)
  const memberships = await Promise.all(
    snap.docs.map(async (d) => {
      const clinicId = d.ref.parent.parent?.id
      if (!clinicId) return null
      const member = d.data() as Member
      await syncClinicMembershipIndex(uid, clinicId, { memberId: d.id, role: member.role })
      const clinicSnap = await getDoc(doc(db, 'clinics', clinicId))
      const clinic = clinicSnap.data() as Omit<Clinic, 'id'> | undefined
      return {
        clinicId,
        memberId: d.id,
        clinicName: clinic?.name ?? 'Consultorio',
        clinicLogoURL: clinic?.logoURL,
        clinicTheme: clinic?.theme,
        role: member.role as Role,
      } satisfies Membership
    }),
  )

  return memberships.filter((m) => m !== null) as Membership[]
}
