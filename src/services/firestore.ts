import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  writeBatch,
  query,
  type QueryConstraint,
  type DocumentData,
  type WriteBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/**
 * Helpers genéricos de Firestore para no repetir la misma lógica en cada service.
 * Todos devuelven datos tipados con el `id` del doc incluido.
 */

type WithId = { id: string }

export async function getOne<T extends WithId>(path: string): Promise<T | null> {
  const snap = await getDoc(doc(db, path))
  if (!snap.exists()) return null
  return { id: snap.id, ...(snap.data() as Omit<T, 'id'>) } as T
}

/**
 * Igual que `getOne` pero sin caché: va siempre al servidor y, si no hay red,
 * TIRA (`unavailable`) en vez de devolver `null`.
 *
 * Para lecturas donde `null` es una decisión, no un dato. Con
 * `persistentLocalCache` activo (ver src/lib/firebase.ts), un `getDoc` sin red
 * resuelve desde IndexedDB y un doc que nunca se cacheó da `exists() === false`,
 * indistinguible de "no existe". En el índice de login eso significaba decirle
 * "no estás dado de alta" a un paciente que sí estaba. Preferimos un error visible
 * y un "probá de nuevo" antes que una respuesta cacheada decidiendo si un email
 * está registrado.
 */
export async function getOneFromServer<T extends WithId>(path: string): Promise<T | null> {
  const snap = await getDocFromServer(doc(db, path))
  if (!snap.exists()) return null
  return { id: snap.id, ...(snap.data() as Omit<T, 'id'>) } as T
}

export async function getMany<T extends WithId>(
  path: string,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  const ref = collection(db, path)
  const snap = await getDocs(constraints.length ? query(ref, ...constraints) : ref)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<T, 'id'>) }) as T)
}

export async function setOne(path: string, data: DocumentData): Promise<void> {
  await setDoc(doc(db, path), data, { merge: true })
}

export async function updateOne(path: string, data: DocumentData): Promise<void> {
  await updateDoc(doc(db, path), data)
}

export async function addToCollection(path: string, data: DocumentData): Promise<string> {
  const ref = await addDoc(collection(db, path), data)
  return ref.id
}

export async function removeOne(path: string): Promise<void> {
  await deleteDoc(doc(db, path))
}

export function createBatch(): WriteBatch {
  return writeBatch(db)
}

/**
 * Id para un doc nuevo SIN escribirlo (no hace ningún round-trip).
 *
 * Sirve para armar un batch que escriba el doc y sus índices juntos: sin esto
 * habría que crear el doc primero para conocer su id, que es justo lo que rompe
 * la atomicidad.
 */
export function newDocId(collectionPath: string): string {
  return doc(collection(db, collectionPath)).id
}

/**
 * Helpers de batch, para que los services no tengan que tocar `db` ni armar refs.
 * `batchSet` sobrescribe (sin merge), igual que `setDoc(ref, data)`.
 */
export function batchSet(batch: WriteBatch, path: string, data: DocumentData): void {
  batch.set(doc(db, path), data)
}

export function batchUpdate(batch: WriteBatch, path: string, data: DocumentData): void {
  batch.update(doc(db, path), data)
}

export function batchDelete(batch: WriteBatch, path: string): void {
  batch.delete(doc(db, path))
}
