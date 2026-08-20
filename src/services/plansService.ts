import { orderBy } from 'firebase/firestore'
import type { SubscriptionPlan } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { addToCollection, getMany, removeOne, updateOne } from './firestore'
import { paths } from './paths'

export function listPlans() {
  if (env.demoMode) return demo.listPlans()
  return getMany<SubscriptionPlan>(paths.plans(), orderBy('price'))
}

export function createPlan(data: Omit<SubscriptionPlan, 'id'>) {
  if (env.demoMode) return demo.createPlan(data)
  return addToCollection(paths.plans(), data)
}

export function updatePlan(planId: string, data: Partial<SubscriptionPlan>) {
  if (env.demoMode) return demo.updatePlan(planId, data)
  return updateOne(paths.plan(planId), data)
}

export function removePlan(planId: string) {
  if (env.demoMode) return demo.removePlan(planId)
  return removeOne(paths.plan(planId))
}
