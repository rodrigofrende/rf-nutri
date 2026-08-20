import type { DateValue } from '@/types'
import { toDate } from './format'

/** Días de gracia: a partir de acá la deuda bloquea/suspende el acceso. */
export const GRACE_DAYS = 14

const DAY_MS = 24 * 60 * 60 * 1000

export type PaymentState = 'al_dia' | 'overdue' | 'blocked'

export interface PaymentStatus {
  state: PaymentState
  daysOverdue: number // días pasados del vencimiento (0 si está al día)
  owesSince: Date | null // vencimiento impago, o null
  monthsOwed: number // cuotas adeudadas (0 si al día)
}

/**
 * Estado de pago derivado de fechas. `paid`/al día si hoy ≤ vencimiento;
 * `overdue` dentro de los GRACE_DAYS; `blocked` si supera la gracia.
 */
export function getPaymentStatus(
  dueDate: DateValue | undefined,
  _lastPaymentDate?: DateValue,
): PaymentStatus {
  const due = toDate(dueDate)
  if (!due) return { state: 'al_dia', daysOverdue: 0, owesSince: null, monthsOwed: 0 }

  const now = new Date()
  const daysOverdue = Math.floor((now.getTime() - due.getTime()) / DAY_MS)

  if (daysOverdue <= 0) {
    return { state: 'al_dia', daysOverdue: 0, owesSince: null, monthsOwed: 0 }
  }
  const monthsOwed = Math.max(1, Math.ceil(daysOverdue / 30))
  return {
    state: daysOverdue > GRACE_DAYS ? 'blocked' : 'overdue',
    daysOverdue,
    owesSince: due,
    monthsOwed,
  }
}

/** Monto adeudado = cuotas vencidas × cuota mensual. */
export function amountOwed(monthlyCost: number | undefined, monthsOwed: number): number {
  return (monthlyCost ?? 0) * monthsOwed
}

/** Suma meses a una fecha (para avanzar el próximo vencimiento al registrar un pago). */
export function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}
