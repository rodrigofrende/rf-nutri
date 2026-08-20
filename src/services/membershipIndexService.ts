import { deleteDoc, doc, setDoc } from 'firebase/firestore'
import type { Role } from '@/types'
import { env } from '@/config/env'
import { db } from '@/lib/firebase'
import { paths } from './paths'

export interface ClinicMembershipIndex {
  memberId: string
  role: Role
}

/** Índice en users/{uid}/clinicMemberships/{clinicId} para rules de pertenencia al tenant. */
export async function syncClinicMembershipIndex(
  uid: string,
  clinicId: string,
  data: ClinicMembershipIndex,
): Promise<void> {
  if (env.demoMode || !uid) return
  await setDoc(doc(db, paths.userClinicMembership(uid, clinicId)), data)
}

export async function removeClinicMembershipIndex(uid: string, clinicId: string): Promise<void> {
  if (env.demoMode || !uid) return
  await deleteDoc(doc(db, paths.userClinicMembership(uid, clinicId)))
}
