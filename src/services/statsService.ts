import { Timestamp } from 'firebase/firestore'
import type { AdminStats } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { monthKey } from '@/utils/dates'
import { toDate } from '@/utils/format'
import { getOne, setOne } from './firestore'
import { paths } from './paths'
import { listMembers } from './membersService'
import { listPayments } from './paymentsService'
import { listMealPlans } from './mealPlansService'

export async function getStats(clinicId: string) {
  if (env.demoMode) return demo.getStats(clinicId)
  return getOne<AdminStats & { id: string }>(paths.statsSummary(clinicId))
}

/**
 * Recalcula el doc agregado de stats. Query "larga" → se cachea en Firestore y
 * en React Query; se invoca on-demand (botón actualizar) o tras altas/bajas.
 */
export async function recomputeStats(clinicId: string): Promise<AdminStats> {
  if (env.demoMode) return demo.recomputeStats(clinicId)
  const [members, payments, mealPlans] = await Promise.all([
    listMembers(clinicId),
    listPayments(clinicId),
    listMealPlans(clinicId),
  ])
  const pacientes = members.filter((m) => m.role === 'user')
  const thisMonth = monthKey(new Date())

  const stats: AdminStats = {
    patientCount: pacientes.length,
    monthlyRevenue: payments
      .filter((p) => {
        const d = toDate(p.date)
        return d ? monthKey(d) === thisMonth : false
      })
      .reduce((sum, p) => sum + p.amount, 0),
    plansSent: mealPlans.filter((p) => p.status === 'active' && !p.isTemplate).length,
    updatedAt: Timestamp.now(),
  }
  await setOne(paths.statsSummary(clinicId), stats)
  return stats
}
