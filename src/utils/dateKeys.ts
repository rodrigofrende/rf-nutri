/**
 * Claves de fecha determinísticas para doc-ids de Firestore.
 * - dayKey  'YYYY-MM-DD'  → diario (1 doc por comida/día) y peso (1 por día)
 * - weekKey 'YYYY-Www'    → check-ins (1 por semana ISO)
 * Siempre en hora LOCAL del dispositivo: el "día" del paciente es su día.
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** 'YYYY-MM-DD' local. */
export function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayKey(): string {
  return toDayKey(new Date())
}

/** Parsea un dayKey a Date local (00:00). Inválido → null. */
export function parseDayKey(dayKey: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/**
 * Semana ISO 8601: lunes como primer día; la semana 1 es la que contiene el
 * primer jueves del año. El año del weekKey es el ISO (puede diferir del civil
 * en los bordes de año).
 */
export function toWeekKey(date: Date): string {
  // Algoritmo estándar: llevar la fecha al jueves de su semana y contar semanas.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7 // domingo → 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum) // jueves de esta semana
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${pad(week)}`
}

export function currentWeekKey(): string {
  return toWeekKey(new Date())
}

/** Los últimos `n` dayKeys terminando hoy (inclusive), ascendentes. */
export function lastNDayKeys(n: number, from: Date = new Date()): string[] {
  const keys: string[] = []
  for (let i = n - 1; i >= 0; i--) keys.push(toDayKey(addDays(from, -i)))
  return keys
}
