import type { ClinicDashboard } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { buildDashboard } from '@/utils/dashboard'
import { addDays, toDayKey } from '@/utils/dateKeys'
import { listMembers } from './membersService'
import { listPayments } from './paymentsService'
import { listAppointmentsByRange } from './appointmentsService'
import { listDiaryEntries } from './diaryService'
import { listMealPlans } from './mealPlansService'
import { listClinics } from './clinicsService'

export interface PlatformStats {
  pacientes: number
  mealPlans: number
  consultorios: number
}

const DASHBOARD_MEMBER_BATCH = 15

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize)
    out.push(...(await Promise.all(chunk.map(fn))))
  }
  return out
}

/** KPIs + series del panel del admin. Consultas paginadas por lotes para evitar N+1 simultáneo. */
export async function getDashboard(clinicId: string): Promise<ClinicDashboard> {
  if (env.demoMode) return demo.getDashboard(clinicId)

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diaryFrom = toDayKey(addDays(now, -55)) // ~8 semanas para la serie de adherencia
  const diaryTo = toDayKey(now)

  const members = await listMembers(clinicId)
  const pacientes = members.filter((m) => m.role === 'user')
  const [payments, weekAppointments, mealPlans, diaryArr] = await Promise.all([
    listPayments(clinicId),
    listAppointmentsByRange(clinicId, startOfToday, addDays(startOfToday, 7)),
    listMealPlans(clinicId),
    mapInBatches(pacientes, DASHBOARD_MEMBER_BATCH, (m) =>
      listDiaryEntries(clinicId, m.id, diaryFrom, diaryTo),
    ),
  ])

  return buildDashboard({
    members,
    payments,
    weekAppointments,
    diaryEntries: diaryArr.flat(),
    activePlans: mealPlans.filter((p) => p.status === 'active' && !p.isTemplate).length,
  })
}

/** Totales de toda la plataforma (super-admin). Agrega por consultorio. */
export async function getPlatformStats(): Promise<PlatformStats> {
  if (env.demoMode) return demo.getPlatformStats()

  const clinics = await listClinics()
  const per = await Promise.all(
    clinics.map(async (c) => {
      const [members, mealPlans] = await Promise.all([listMembers(c.id), listMealPlans(c.id)])
      return {
        pacientes: members.filter((m) => m.role === 'user').length,
        mealPlans: mealPlans.length,
      }
    }),
  )
  return per.reduce(
    (acc, x) => ({
      pacientes: acc.pacientes + x.pacientes,
      mealPlans: acc.mealPlans + x.mealPlans,
      consultorios: acc.consultorios,
    }),
    { pacientes: 0, mealPlans: 0, consultorios: clinics.length },
  )
}
