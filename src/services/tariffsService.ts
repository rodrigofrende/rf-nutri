import { orderBy } from 'firebase/firestore'
import type { Tariff } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { addToCollection, getMany, removeOne, updateOne } from './firestore'
import { paths } from './paths'

export function listTariffs(clinicId: string) {
  if (env.demoMode) return demo.listTariffs(clinicId)
  return getMany<Tariff>(paths.tariffs(clinicId), orderBy('name'))
}

export function createTariff(clinicId: string, data: Omit<Tariff, 'id'>) {
  if (env.demoMode) return demo.createTariff(clinicId, data)
  return addToCollection(paths.tariffs(clinicId), data)
}

export function updateTariff(clinicId: string, tariffId: string, data: Partial<Tariff>) {
  if (env.demoMode) return demo.updateTariff(clinicId, tariffId, data)
  return updateOne(paths.tariff(clinicId, tariffId), data)
}

export function removeTariff(clinicId: string, tariffId: string) {
  if (env.demoMode) return demo.removeTariff(clinicId, tariffId)
  return removeOne(paths.tariff(clinicId, tariffId))
}
