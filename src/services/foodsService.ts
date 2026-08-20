import { orderBy } from 'firebase/firestore'
import type { Food } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { FOODS_SEED } from '@/data/foodsSeed'
import { addToCollection, batchSet, createBatch, getMany, removeOne, updateOne } from './firestore'
import { paths } from './paths'

export function listFoods(clinicId: string) {
  if (env.demoMode) return demo.listFoods(clinicId)
  return getMany<Food>(paths.foods(clinicId), orderBy('name'))
}

export function createFood(clinicId: string, data: Omit<Food, 'id'>) {
  if (env.demoMode) return demo.createFood(clinicId, data)
  return addToCollection(paths.foods(clinicId), data)
}

export function updateFood(clinicId: string, foodId: string, data: Partial<Omit<Food, 'id'>>) {
  if (env.demoMode) return demo.updateFood(clinicId, foodId, data)
  return updateOne(paths.food(clinicId, foodId), data)
}

export function removeFood(clinicId: string, foodId: string) {
  if (env.demoMode) return demo.removeFood(clinicId, foodId)
  return removeOne(paths.food(clinicId, foodId))
}

/** Máximo de escrituras por WriteBatch de Firestore. */
const BATCH_LIMIT = 500

/**
 * Importa el catálogo base de alimentos argentinos al consultorio.
 * IDEMPOTENTE: los ids del seed son determinísticos (`seed-<slug>`) y los
 * alimentos ya existentes se saltean — nunca pisa personalizaciones del
 * profesional. Devuelve cuántos se importaron.
 */
export async function importSeedFoods(clinicId: string, createdBy: string): Promise<number> {
  if (env.demoMode) return demo.importSeedFoods(clinicId, createdBy)
  const existing = await listFoods(clinicId)
  const existingIds = new Set(existing.map((f) => f.id))
  const pending = FOODS_SEED.filter((f) => !existingIds.has(f.id))
  for (let i = 0; i < pending.length; i += BATCH_LIMIT) {
    const batch = createBatch()
    for (const seed of pending.slice(i, i + BATCH_LIMIT)) {
      const { id, ...data } = seed
      batchSet(batch, paths.food(clinicId, id), {
        ...data,
        source: 'seed',
        active: true,
        createdBy,
      })
    }
    await batch.commit()
  }
  return pending.length
}
