import type { AppointmentStatus, AppointmentType } from '@/types'

/**
 * Labels y tonos de turnos centralizados: la agenda del admin y cualquier otra
 * superficie que muestre turnos leen de acá, para que el wording y los colores
 * sean uno solo en toda la app.
 */

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  primera_consulta: 'Primera consulta',
  seguimiento: 'Seguimiento',
  antropometria: 'Antropometría',
  virtual: 'Virtual',
  otro: 'Otro',
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Programado',
  confirmed: 'Confirmado',
  completed: 'Completado',
  cancelled: 'Cancelado',
  no_show: 'Ausente',
}

/**
 * Tono del Badge por estado. Completado y cancelado comparten el gris neutro
 * (ambos son turnos "cerrados"); el cancelado se distingue además atenuando la
 * card completa donde se renderiza.
 */
export const APPOINTMENT_STATUS_TONES: Record<
  AppointmentStatus,
  'neutral' | 'green' | 'amber' | 'red'
> = {
  scheduled: 'amber',
  confirmed: 'green',
  completed: 'neutral',
  cancelled: 'neutral',
  no_show: 'red',
}
