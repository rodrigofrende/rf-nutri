import { Timestamp } from 'firebase/firestore'
import type { DateValue } from '@/types'

/** Normaliza un valor de fecha de Firestore (Timestamp | Date | null) a Date. */
export function toDate(value: DateValue | undefined): Date | null {
  if (!value) return null
  if (value instanceof Timestamp) return value.toDate()
  if (value instanceof Date) return value
  return null
}

export function formatDate(value: DateValue | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(date)
}

/** Para inputs type="date" (YYYY-MM-DD). */
export function toDateInput(value: DateValue | undefined): string {
  const date = toDate(value)
  if (!date) return ''
  return date.toISOString().slice(0, 10)
}

export function formatCurrency(amount: number | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Entero con `.` de miles, sin símbolo ni decimales (30000 → "30.000"). */
export function formatThousands(amount: number | undefined): string {
  if (amount == null || Number.isNaN(amount)) return ''
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(amount))
}

/** Convierte lo tipeado en un input de dinero a número entero (saca todo lo no-dígito). */
export function parseMoney(value: string): number {
  const digits = value.replace(/\D/g, '')
  return digits ? parseInt(digits, 10) : 0
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** "Rodrigo Frende" → "Rodrigo F." (no sensible, para superficies visibles por todo el clinic). */
export function displayNameShort(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  const first = (parts[0] ?? '').slice(0, 30)
  if (!first) return 'Paciente'
  const lastInitial = parts.length > 1 ? (parts[parts.length - 1][0]?.toUpperCase() ?? '') : ''
  return lastInitial ? `${first} ${lastInitial}.` : first
}
