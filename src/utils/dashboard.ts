import type { Appointment, ClinicDashboard, MealDiaryEntry, Member, PatientPayment } from '@/types'
import { toDate } from './format'
import { lastNMonths, lastNWeeks, monthKey, weekKey } from './dates'
import { parseDayKey, todayKey } from './dateKeys'

export interface DashboardInput {
  members: Member[]
  /** Todos los cobros del consultorio (una sola query a clinics/{id}/payments). */
  payments: PatientPayment[]
  /** Turnos desde hoy hasta +7 días. */
  weekAppointments: Appointment[]
  /** Entradas de diario de todos los pacientes, últimas ~8 semanas (flatten). */
  diaryEntries: MealDiaryEntry[]
  /** Planes alimentarios con status 'active'. */
  activePlans: number
}

/** % de comidas cumplidas ('done' = 1, 'partial' = 0.5) sobre lo registrado. */
function adherencePct(entries: MealDiaryEntry[]): number {
  if (entries.length === 0) return 0
  const score = entries.reduce(
    (sum, e) => sum + (e.status === 'done' ? 1 : e.status === 'partial' ? 0.5 : 0),
    0,
  )
  return Math.round((score / entries.length) * 100)
}

/** Construye los KPIs + series del panel a partir de la data cruda. Función pura. */
export function buildDashboard({
  members,
  payments,
  weekAppointments,
  diaryEntries,
  activePlans,
}: DashboardInput): ClinicDashboard {
  const pacientes = members.filter((m) => m.role === 'user')
  const now = new Date()
  const thisMonth = monthKey(now)
  const today = todayKey()

  const activos = pacientes.filter((m) => m.status !== 'paused').length
  const pausados = pacientes.length - activos

  const cobradoEsteMes = payments
    .filter((p) => {
      const d = toDate(p.date)
      return d ? monthKey(d) === thisMonth : false
    })
    .reduce((sum, p) => sum + p.amount, 0)

  const months = lastNMonths(6, now)
  const revByKey = new Map(months.map((m) => [m.key, 0]))
  const altasByKey = new Map(months.map((m) => [m.key, 0]))
  for (const p of payments) {
    const d = toDate(p.date)
    if (d && revByKey.has(monthKey(d))) revByKey.set(monthKey(d), (revByKey.get(monthKey(d)) ?? 0) + p.amount)
  }
  for (const m of pacientes) {
    const d = toDate(m.startDate)
    if (d && altasByKey.has(monthKey(d))) altasByKey.set(monthKey(d), (altasByKey.get(monthKey(d)) ?? 0) + 1)
  }

  // Adherencia por semana (últimas ~8) + media de los últimos 7 días.
  const weeks = lastNWeeks(8, now)
  const entriesByWeek = new Map<string, MealDiaryEntry[]>(weeks.map((w) => [w.key, []]))
  for (const e of diaryEntries) {
    const d = parseDayKey(e.dayKey)
    if (!d) continue
    const wk = weekKey(d)
    entriesByWeek.get(wk)?.push(e)
  }
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const last7 = diaryEntries.filter((e) => {
    const d = parseDayKey(e.dayKey)
    return d ? d >= new Date(sevenDaysAgo.getFullYear(), sevenDaysAgo.getMonth(), sevenDaysAgo.getDate()) : false
  })

  const validAppointments = weekAppointments.filter(
    (a) => a.status !== 'cancelled' && a.status !== 'no_show',
  )

  return {
    pacientesActivos: activos,
    pacientesTotal: pacientes.length,
    cobradoEsteMes,
    turnosHoy: validAppointments.filter((a) => a.dayKey === today).length,
    turnosSemana: validAppointments.length,
    planesActivos: activePlans,
    adherenciaMedia: adherencePct(last7),
    revenueByMonth: months.map((m) => ({ label: m.label, value: revByKey.get(m.key) ?? 0 })),
    altasByMonth: months.map((m) => ({ label: m.label, value: altasByKey.get(m.key) ?? 0 })),
    adherenceByWeek: weeks.map((w) => ({
      label: w.label,
      value: adherencePct(entriesByWeek.get(w.key) ?? []),
    })),
    statusBreakdown: [
      { key: 'active', label: 'Activos', value: activos },
      { key: 'paused', label: 'Pausados', value: pausados },
    ],
  }
}
